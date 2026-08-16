<?php
/**
 * Store API checkout/cart extension for the headless frontend.
 *
 * - `POST /wc/store/v1/cart/extensions` (namespace `bohemia`): stores the chosen payment method
 *   and the Zásilkovna pickup point in the WC session; the cart response gets
 *   `extensions.bohemia = { chosen_payment_method, pickup_point, cod_fee }`.
 * - COD fee "Dobírka" added to the cart when the chosen payment method is `cod`.
 * - `POST /wc/store/v1/checkout` accepts `extensions.bohemia = { pickup_point, ico, dic }`,
 *   validates the pickup point for the `bohemia_zasilkovna` shipping method and stores
 *   `_bohemia_packeta_point`, `_bohemia_packeta_point_id`, `_bohemia_ico`, `_bohemia_dic` on the order.
 * - Admin order meta box + e-mail block with the pickup point and IČO/DIČ.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use Automattic\WooCommerce\StoreApi\StoreApi;
use Automattic\WooCommerce\StoreApi\Schemas\ExtendSchema;
use Automattic\WooCommerce\StoreApi\Schemas\V1\CartSchema;
use Automattic\WooCommerce\StoreApi\Schemas\V1\CheckoutSchema;
use Automattic\WooCommerce\StoreApi\Exceptions\RouteException;

class Bohemia_Checkout_Extension {

	const NAMESPACE_KEY       = 'bohemia';
	const SESSION_PICKUP      = 'bohemia_pickup_point';
	const SHIPPING_METHOD_ID  = 'bohemia_zasilkovna';
	const COD_FEE_NAME        = 'Dobírka';
	const META_POINT          = '_bohemia_packeta_point';
	const META_POINT_ID       = '_bohemia_packeta_point_id';
	const META_ICO            = '_bohemia_ico';
	const META_DIC            = '_bohemia_dic';
	const SHIPPING_ITEM_META  = 'Výdejní místo';

	/** Keys of a pickup point object (contract: PickupPoint). */
	const POINT_KEYS = array( 'id', 'name', 'street', 'city', 'zip', 'country', 'carrier_id', 'carrier_pickup_point_id', 'url' );

	public static function init() {
		// Store API schema extension. `woocommerce_blocks_loaded` fires on plugins_loaded:10,
		// i.e. before `bohemia_wc_init` (plugins_loaded:20) – register immediately in that case.
		if ( did_action( 'woocommerce_blocks_loaded' ) ) {
			self::register_store_api_extension();
		} else {
			add_action( 'woocommerce_blocks_loaded', array( __CLASS__, 'register_store_api_extension' ) );
		}

		// COD fee.
		add_action( 'woocommerce_cart_calculate_fees', array( __CLASS__, 'add_cod_fee' ), 20 );

		// Sync payment method from the checkout request into the session BEFORE the draft order is
		// built from the cart (OrderController::update_order_from_cart() recalculates cart totals),
		// so the COD fee is present/absent consistently with the payment method actually chosen.
		add_action( 'woocommerce_store_api_checkout_update_customer_from_request', array( __CLASS__, 'sync_payment_method_from_request' ), 10, 2 );

		// Order data from the checkout request.
		add_action( 'woocommerce_store_api_checkout_update_order_from_request', array( __CLASS__, 'update_order_from_request' ), 10, 2 );

		// Admin + e-mails.
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_box' ) );
		add_action( 'woocommerce_email_order_meta', array( __CLASS__, 'email_order_meta' ), 10, 4 );
	}

	/* ------------------------------------------------------------------ */
	/* Store API extension                                                 */
	/* ------------------------------------------------------------------ */

	public static function register_store_api_extension() {
		if ( ! class_exists( StoreApi::class ) || ! class_exists( ExtendSchema::class ) ) {
			return;
		}

		try {
			$extend = StoreApi::container()->get( ExtendSchema::class );

			// Checkout: request extensions.bohemia = { pickup_point, ico, dic }.
			$extend->register_endpoint_data(
				array(
					'endpoint'        => CheckoutSchema::IDENTIFIER,
					'namespace'       => self::NAMESPACE_KEY,
					'schema_callback' => array( __CLASS__, 'checkout_schema' ),
					'schema_type'     => ARRAY_A,
				)
			);

			// Cart: response extensions.bohemia = { chosen_payment_method, pickup_point, cod_fee }.
			$extend->register_endpoint_data(
				array(
					'endpoint'        => CartSchema::IDENTIFIER,
					'namespace'       => self::NAMESPACE_KEY,
					'schema_callback' => array( __CLASS__, 'cart_schema' ),
					'data_callback'   => array( __CLASS__, 'cart_data' ),
					'schema_type'     => ARRAY_A,
				)
			);

			// POST /wc/store/v1/cart/extensions { namespace: 'bohemia', data: {...} }.
			$extend->register_update_callback(
				array(
					'namespace' => self::NAMESPACE_KEY,
					'callback'  => array( __CLASS__, 'cart_extensions_update' ),
				)
			);
		} catch ( \Throwable $e ) {
			if ( function_exists( 'wc_get_logger' ) ) {
				wc_get_logger()->error( 'Bohemia Store API extension registration failed: ' . $e->getMessage(), array( 'source' => 'bohemia-headless' ) );
			}
		}
	}

	private static function pickup_point_schema() {
		$string = array(
			'type'    => array( 'string', 'null' ),
			'context' => array( 'view', 'edit' ),
		);
		return array(
			'description' => 'Zásilkovna – výdejní místo (Packeta widget).',
			'type'        => array( 'object', 'null' ),
			'context'     => array( 'view', 'edit' ),
			'properties'  => array(
				'id'                      => array(
					'type'    => array( 'string', 'integer', 'null' ),
					'context' => array( 'view', 'edit' ),
				),
				'name'                    => $string,
				'street'                  => $string,
				'city'                    => $string,
				'zip'                     => $string,
				'country'                 => $string,
				'carrier_id'              => array(
					'type'    => array( 'string', 'integer', 'null' ),
					'context' => array( 'view', 'edit' ),
				),
				'carrier_pickup_point_id' => array(
					'type'    => array( 'string', 'integer', 'null' ),
					'context' => array( 'view', 'edit' ),
				),
				'url'                     => $string,
			),
		);
	}

	public static function checkout_schema() {
		return array(
			'pickup_point' => self::pickup_point_schema(),
			'ico'          => array(
				'description' => 'IČO',
				'type'        => array( 'string', 'null' ),
				'context'     => array( 'view', 'edit' ),
			),
			'dic'          => array(
				'description' => 'DIČ',
				'type'        => array( 'string', 'null' ),
				'context'     => array( 'view', 'edit' ),
			),
		);
	}

	public static function cart_schema() {
		return array(
			'chosen_payment_method' => array(
				'description' => 'Zvolená platební metoda (id brány).',
				'type'        => array( 'string', 'null' ),
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
			'pickup_point'          => array_merge( self::pickup_point_schema(), array( 'readonly' => true ) ),
			'cod_fee'               => array(
				'description' => 'Poplatek za dobírku (Kč).',
				'type'        => 'number',
				'context'     => array( 'view', 'edit' ),
				'readonly'    => true,
			),
		);
	}

	public static function cart_data() {
		$session = function_exists( 'WC' ) ? WC()->session : null;
		$chosen  = $session ? $session->get( 'chosen_payment_method' ) : null;
		return array(
			'chosen_payment_method' => $chosen ? (string) $chosen : null,
			'pickup_point'          => self::get_session_pickup_point(),
			'cod_fee'               => self::cod_fee_amount(),
		);
	}

	/**
	 * Update callback for POST /wc/store/v1/cart/extensions.
	 *
	 * @param array $data { payment_method?: string, pickup_point?: array|null }
	 */
	public static function cart_extensions_update( $data ) {
		$data    = is_array( $data ) ? $data : array();
		$session = WC()->session;
		if ( ! $session ) {
			return;
		}

		if ( array_key_exists( 'payment_method', $data ) ) {
			$method = self::sanitize_payment_method( $data['payment_method'] );
			if ( $method ) {
				$session->set( 'chosen_payment_method', $method );
			}
		}

		if ( array_key_exists( 'pickup_point', $data ) ) {
			$point = self::sanitize_pickup_point( $data['pickup_point'] );
			$session->set( self::SESSION_PICKUP, $point );
		}
	}

	/* ------------------------------------------------------------------ */
	/* COD fee                                                             */
	/* ------------------------------------------------------------------ */

	public static function cod_fee_amount() {
		$fee = Bohemia_Settings::get( 'cod_fee' );
		$fee = (float) str_replace( ',', '.', (string) $fee );
		return $fee > 0 ? $fee : 0.0;
	}

	/**
	 * @param WC_Cart $cart Cart.
	 */
	public static function add_cod_fee( $cart ) {
		if ( ! $cart instanceof WC_Cart || ! WC()->session ) {
			return;
		}
		if ( is_admin() && ! wp_doing_ajax() && ! ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
			return;
		}
		$fee = self::cod_fee_amount();
		if ( $fee <= 0 ) {
			return;
		}
		if ( 'cod' !== WC()->session->get( 'chosen_payment_method' ) ) {
			return;
		}
		$cart->add_fee( self::COD_FEE_NAME, $fee, false );
	}

	/**
	 * Called with ($customer, $request) from the Store API checkout route before the draft order is built.
	 */
	public static function sync_payment_method_from_request( $customer, $request = null ) {
		if ( ! $request instanceof WP_REST_Request || ! WC()->session ) {
			return;
		}
		$raw = $request->get_param( 'payment_method' );
		if ( empty( $raw ) ) {
			return;
		}
		$method = self::sanitize_payment_method( $raw );
		if ( $method ) {
			WC()->session->set( 'chosen_payment_method', $method );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Checkout → order                                                    */
	/* ------------------------------------------------------------------ */

	/**
	 * @param WC_Order        $order   Order being created/updated.
	 * @param WP_REST_Request $request Checkout request.
	 * @throws RouteException When Zásilkovna is selected without a pickup point.
	 */
	public static function update_order_from_request( $order, $request ) {
		if ( ! $order instanceof WC_Order || ! $request instanceof WP_REST_Request ) {
			return;
		}

		$extensions = $request->get_param( 'extensions' );
		$ext        = ( is_array( $extensions ) && isset( $extensions[ self::NAMESPACE_KEY ] ) && is_array( $extensions[ self::NAMESPACE_KEY ] ) )
			? $extensions[ self::NAMESPACE_KEY ]
			: array();

		// Keep the session payment method consistent with the request (fee consistency on retries).
		$raw_method = $request->get_param( 'payment_method' );
		if ( ! empty( $raw_method ) && WC()->session ) {
			$method = self::sanitize_payment_method( $raw_method );
			if ( $method ) {
				WC()->session->set( 'chosen_payment_method', $method );
			}
		}

		// Pickup point: request first, then session.
		$point = null;
		if ( array_key_exists( 'pickup_point', $ext ) ) {
			$point = self::sanitize_pickup_point( $ext['pickup_point'] );
		}
		if ( ! $point ) {
			$point = self::get_session_pickup_point();
		}

		$is_zasilkovna = self::order_uses_zasilkovna( $order );
		$is_post       = 'POST' === strtoupper( (string) $request->get_method() );

		if ( $is_zasilkovna && ! $point && $is_post ) {
			throw new RouteException( 'bohemia_pickup_point_required', 'Vyberte prosím výdejní místo Zásilkovny.', 400 );
		}

		if ( $point && WC()->session ) {
			WC()->session->set( self::SESSION_PICKUP, $point );
		}

		// Order meta (HPOS-safe). A pickup point only makes sense for Zásilkovna orders.
		if ( ! $is_zasilkovna ) {
			$point = null;
		}
		if ( $point ) {
			$order->update_meta_data( self::META_POINT, $point );
			$order->update_meta_data( self::META_POINT_ID, (string) $point['id'] );
		} else {
			$order->delete_meta_data( self::META_POINT );
			$order->delete_meta_data( self::META_POINT_ID );
		}

		if ( array_key_exists( 'ico', $ext ) ) {
			$order->update_meta_data( self::META_ICO, self::sanitize_ico( $ext['ico'] ) );
		}
		if ( array_key_exists( 'dic', $ext ) ) {
			$order->update_meta_data( self::META_DIC, self::sanitize_dic( $ext['dic'] ) );
		}

		// Show the pickup point on the shipping line (admin, e-mails, packing slips).
		self::sync_shipping_item_meta( $order, $point );

		// Safety net: make sure the order fee lines match the payment method (COD fee).
		self::sync_order_cod_fee( $order );
	}

	/**
	 * True when the order (or the current session) uses the Zásilkovna shipping method.
	 */
	private static function order_uses_zasilkovna( WC_Order $order ) {
		foreach ( $order->get_shipping_methods() as $item ) {
			if ( self::SHIPPING_METHOD_ID === $item->get_method_id() ) {
				return true;
			}
		}
		if ( 0 === count( $order->get_shipping_methods() ) && WC()->session ) {
			$chosen = WC()->session->get( 'chosen_shipping_methods' );
			foreach ( (array) $chosen as $rate_id ) {
				if ( is_string( $rate_id ) && self::SHIPPING_METHOD_ID === current( explode( ':', $rate_id ) ) ) {
					return true;
				}
			}
		}
		return false;
	}

	private static function sync_shipping_item_meta( WC_Order $order, $point ) {
		foreach ( $order->get_shipping_methods() as $item ) {
			if ( self::SHIPPING_METHOD_ID !== $item->get_method_id() ) {
				continue;
			}
			if ( $point ) {
				$item->update_meta_data( self::SHIPPING_ITEM_META, self::format_pickup_point( $point ) );
			} else {
				$item->delete_meta_data( self::SHIPPING_ITEM_META );
			}
			// Persisted items save right away; unsaved ones are stored with the order.
			if ( $item->get_id() && $item->get_order_id() ) {
				$item->save();
			}
		}
	}

	/**
	 * Ensure the "Dobírka" fee line matches the payment method chosen in the request. Normally the
	 * cart already contains it (session synced before totals), this only fixes edge cases.
	 */
	private static function sync_order_cod_fee( WC_Order $order ) {
		$fee    = self::cod_fee_amount();
		$is_cod = 'cod' === $order->get_payment_method();

		$existing = null;
		foreach ( $order->get_fees() as $item ) {
			if ( self::COD_FEE_NAME === $item->get_name() ) {
				$existing = $item;
				break;
			}
		}

		if ( $is_cod && $fee > 0 && ! $existing ) {
			$item = new WC_Order_Item_Fee();
			$item->set_name( self::COD_FEE_NAME );
			$item->set_amount( $fee );
			$item->set_total( $fee );
			$item->set_tax_class( '' );
			$item->set_tax_status( 'none' );
			$order->add_item( $item );
			$order->calculate_totals( false );
		} elseif ( ( ! $is_cod || $fee <= 0 ) && $existing && $existing->get_id() ) {
			$order->remove_item( $existing->get_id() );
			$order->calculate_totals( false );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Sanitizers / helpers                                                */
	/* ------------------------------------------------------------------ */

	/**
	 * @return string|null Gateway id if it is currently available, otherwise null.
	 */
	public static function sanitize_payment_method( $value ) {
		$id = is_scalar( $value ) ? sanitize_key( (string) $value ) : '';
		if ( '' === $id || ! function_exists( 'WC' ) || ! WC()->payment_gateways() ) {
			return null;
		}
		$available = WC()->payment_gateways()->get_available_payment_gateways();
		return isset( $available[ $id ] ) ? $id : null;
	}

	/**
	 * @return array|null Sanitized pickup point (all POINT_KEYS present) or null when invalid/empty.
	 */
	public static function sanitize_pickup_point( $value ) {
		if ( ! is_array( $value ) ) {
			return null;
		}
		$point = array();
		foreach ( self::POINT_KEYS as $key ) {
			$raw = isset( $value[ $key ] ) ? $value[ $key ] : null;
			if ( null === $raw || is_array( $raw ) || is_object( $raw ) ) {
				$point[ $key ] = null;
				continue;
			}
			$raw = (string) $raw;
			if ( 'url' === $key ) {
				$point[ $key ] = esc_url_raw( $raw );
			} else {
				$point[ $key ] = sanitize_text_field( $raw );
			}
		}
		if ( '' === (string) $point['id'] ) {
			return null;
		}
		foreach ( array( 'name', 'street', 'city', 'zip', 'country' ) as $key ) {
			if ( null === $point[ $key ] ) {
				$point[ $key ] = '';
			}
		}
		foreach ( array( 'carrier_id', 'carrier_pickup_point_id' ) as $key ) {
			if ( '' === $point[ $key ] ) {
				$point[ $key ] = null;
			}
		}
		if ( '' === $point['url'] || null === $point['url'] ) {
			unset( $point['url'] );
		}
		return $point;
	}

	public static function sanitize_ico( $value ) {
		$v = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';
		return substr( preg_replace( '/[^0-9]/', '', $v ), 0, 20 );
	}

	public static function sanitize_dic( $value ) {
		$v = is_scalar( $value ) ? sanitize_text_field( (string) $value ) : '';
		return substr( strtoupper( preg_replace( '/[^A-Za-z0-9]/', '', $v ) ), 0, 20 );
	}

	public static function get_session_pickup_point() {
		if ( ! function_exists( 'WC' ) || ! WC()->session ) {
			return null;
		}
		return self::sanitize_pickup_point( WC()->session->get( self::SESSION_PICKUP ) );
	}

	/**
	 * Pickup point stored on an order (sanitized) or null.
	 */
	public static function get_order_pickup_point( WC_Order $order ) {
		return self::sanitize_pickup_point( $order->get_meta( self::META_POINT ) );
	}

	/**
	 * "Name, Street, City" (parts that are non-empty).
	 */
	public static function format_pickup_point( $point ) {
		if ( ! is_array( $point ) ) {
			return '';
		}
		$parts = array();
		foreach ( array( 'name', 'street', 'city' ) as $key ) {
			if ( ! empty( $point[ $key ] ) ) {
				$parts[] = $point[ $key ];
			}
		}
		if ( ! empty( $point['zip'] ) ) {
			$parts[] = $point['zip'];
		}
		return implode( ', ', array_unique( $parts ) );
	}

	/* ------------------------------------------------------------------ */
	/* Admin meta box                                                      */
	/* ------------------------------------------------------------------ */

	public static function add_meta_box() {
		$screens = array( 'shop_order' );
		if ( function_exists( 'wc_get_page_screen_id' ) ) {
			$hpos_screen = wc_get_page_screen_id( 'shop-order' );
			if ( $hpos_screen && ! in_array( $hpos_screen, $screens, true ) ) {
				$screens[] = $hpos_screen;
			}
		}
		foreach ( $screens as $screen ) {
			add_meta_box(
				'bohemia_order_details',
				'Bohemia – zákazník / doručení',
				array( __CLASS__, 'render_meta_box' ),
				$screen,
				'side',
				'default'
			);
		}
	}

	/**
	 * @param WP_Post|WC_Order $object Post (legacy storage) or order (HPOS).
	 */
	public static function render_meta_box( $object ) {
		$order = $object instanceof WC_Order ? $object : wc_get_order( $object instanceof WP_Post ? $object->ID : $object );
		if ( ! $order instanceof WC_Order ) {
			echo '<p>—</p>';
			return;
		}
		$rows = self::order_info_rows( $order );
		if ( empty( $rows ) ) {
			echo '<p>Bez výdejního místa a bez IČO/DIČ.</p>';
			return;
		}
		echo '<table class="widefat striped" style="border:0">';
		foreach ( $rows as $label => $value ) {
			echo '<tr><th style="text-align:left;padding:4px 6px;width:40%">' . esc_html( $label ) . '</th><td style="padding:4px 6px">' . wp_kses_post( $value ) . '</td></tr>';
		}
		echo '</table>';
	}

	/**
	 * Label => value (HTML allowed) rows for admin / e-mails.
	 */
	public static function order_info_rows( WC_Order $order, $html = true ) {
		$rows  = array();
		$point = self::get_order_pickup_point( $order );
		if ( $point ) {
			$text = self::format_pickup_point( $point );
			if ( $html && ! empty( $point['url'] ) ) {
				$text = '<a href="' . esc_url( $point['url'] ) . '" target="_blank" rel="noopener">' . esc_html( $text ) . '</a>';
			} elseif ( $html ) {
				$text = esc_html( $text );
			}
			$rows['Výdejní místo Zásilkovny'] = $text;
			$id_text = (string) $point['id'];
			if ( ! empty( $point['carrier_pickup_point_id'] ) && $point['carrier_pickup_point_id'] !== $point['id'] ) {
				$id_text .= ' (dopravce: ' . $point['carrier_pickup_point_id'] . ')';
			}
			$rows['ID výdejního místa'] = $html ? esc_html( $id_text ) : $id_text;
		}
		$ico = (string) $order->get_meta( self::META_ICO );
		$dic = (string) $order->get_meta( self::META_DIC );
		if ( '' !== $ico ) {
			$rows['IČO'] = $html ? esc_html( $ico ) : $ico;
		}
		if ( '' !== $dic ) {
			$rows['DIČ'] = $html ? esc_html( $dic ) : $dic;
		}
		return $rows;
	}

	/* ------------------------------------------------------------------ */
	/* E-mails                                                             */
	/* ------------------------------------------------------------------ */

	public static function email_order_meta( $order, $sent_to_admin = false, $plain_text = false, $email = null ) {
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		$rows = self::order_info_rows( $order, ! $plain_text );
		if ( empty( $rows ) ) {
			return;
		}
		if ( $plain_text ) {
			echo "\n" . 'DORUČENÍ / FAKTURAČNÍ ÚDAJE' . "\n\n";
			foreach ( $rows as $label => $value ) {
				echo $label . ': ' . $value . "\n"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- plain text e-mail.
			}
			echo "\n";
			return;
		}
		echo '<h2>Doručení / fakturační údaje</h2>';
		echo '<ul style="margin:0 0 16px;padding:0 0 0 18px">';
		foreach ( $rows as $label => $value ) {
			echo '<li><strong>' . esc_html( $label ) . ':</strong> ' . wp_kses_post( $value ) . '</li>';
		}
		echo '</ul>';
	}
}

add_action( 'bohemia_wc_init', array( 'Bohemia_Checkout_Extension', 'init' ) );
