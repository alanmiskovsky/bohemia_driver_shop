<?php
/**
 * Public order lookup for the frontend order confirmation page:
 * GET /wp-json/bohemia/v1/order/{id}?key={order_key}
 *
 * Amounts are plain numbers in major currency units (Kč). When the store shows prices including
 * tax (`woocommerce_prices_include_tax`), item/shipping/fee/discount amounts include tax and `tax`
 * is informational; otherwise they are net and `tax` is additive.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Order_Api {

	public static function init() {
		add_action( 'bohemia_register_rest_routes', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			BOHEMIA_REST_NS,
			'/order/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_order' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'id'  => array( 'required' => true, 'type' => 'integer' ),
					'key' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);
	}

	/**
	 * Load an order and verify its key. Reusable by other modules (e.g. Stripe re-pay endpoint).
	 *
	 * @param int|string $id  Order id.
	 * @param string     $key Order key (wc_order_...).
	 * @return WC_Order|WP_Error
	 */
	public static function get_order_or_error( $id, $key ) {
		$id  = absint( $id );
		$key = is_scalar( $key ) ? trim( (string) $key ) : '';
		if ( ! $id || '' === $key ) {
			return Bohemia_Rest::error( 'bohemia_order_not_found', 'Objednávka nebyla nalezena.', 404 );
		}
		$order = wc_get_order( $id );
		if ( ! $order instanceof WC_Order || 'shop_order' !== $order->get_type() || in_array( $order->get_status(), array( 'checkout-draft', 'trash', 'auto-draft' ), true ) ) {
			return Bohemia_Rest::error( 'bohemia_order_not_found', 'Objednávka nebyla nalezena.', 404 );
		}
		if ( ! hash_equals( (string) $order->get_order_key(), $key ) ) {
			return Bohemia_Rest::error( 'bohemia_invalid_key', 'Neplatný klíč objednávky.', 403 );
		}
		return $order;
	}

	public static function get_order( WP_REST_Request $request ) {
		if ( ! Bohemia_Rest::rate_limit( 'order_lookup', 60, 600 ) ) {
			return Bohemia_Rest::error( 'bohemia_rate_limited', 'Příliš mnoho požadavků, zkuste to prosím později.', 429 );
		}
		$order = self::get_order_or_error( $request->get_param( 'id' ), $request->get_param( 'key' ) );
		if ( is_wp_error( $order ) ) {
			return $order;
		}
		$response = rest_ensure_response( self::format_order( $order ) );
		$response->header( 'Cache-Control', 'no-store' );
		return $response;
	}

	/* ------------------------------------------------------------------ */
	/* Formatting                                                          */
	/* ------------------------------------------------------------------ */

	private static function num( $value ) {
		return round( (float) $value, 2 );
	}

	private static function date( $date ) {
		return $date instanceof WC_DateTime ? $date->date( 'Y-m-d\TH:i:s' ) : null;
	}

	/**
	 * @param WC_Order $order Order.
	 * @return array
	 */
	public static function format_order( WC_Order $order ) {
		$incl = (bool) $order->get_prices_include_tax();

		// Totals.
		$subtotal = 0.0;
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			$subtotal += (float) $item->get_subtotal() + ( $incl ? (float) $item->get_subtotal_tax() : 0 );
		}
		$discount = (float) $order->get_total_discount( ! $incl );
		$shipping = (float) $order->get_shipping_total() + ( $incl ? (float) $order->get_shipping_tax() : 0 );

		$fees = array();
		foreach ( $order->get_fees() as $fee ) {
			$fees[] = array(
				'name'  => $fee->get_name(),
				'total' => self::num( (float) $fee->get_total() + ( $incl ? (float) $fee->get_total_tax() : 0 ) ),
			);
		}

		$totals = array(
			'subtotal' => self::num( $subtotal ),
			'shipping' => self::num( $shipping ),
			'discount' => self::num( max( 0, $discount ) ),
			'fees'     => $fees,
			'tax'      => self::num( $order->get_total_tax() ),
			'total'    => self::num( $order->get_total() ),
		);

		// Payment.
		$method  = (string) $order->get_payment_method();
		$payment = array(
			'method'        => $method,
			'method_title'  => (string) $order->get_payment_method_title(),
			'needs_payment' => $order->needs_payment(),
			'paid'          => $order->is_paid(),
			'date_paid'     => self::date( $order->get_date_paid() ),
		);

		// Bank transfer details.
		$bacs = null;
		if ( 'bacs' === $method ) {
			$bacs = array(
				'accounts'        => self::bacs_accounts(),
				'variable_symbol' => (string) $order->get_order_number(),
				'amount'          => self::num( $order->get_total() ),
			);
		}

		// Addresses.
		$billing = array(
			'first_name' => $order->get_billing_first_name(),
			'last_name'  => $order->get_billing_last_name(),
			'company'    => $order->get_billing_company(),
			'address_1'  => $order->get_billing_address_1(),
			'address_2'  => $order->get_billing_address_2(),
			'city'       => $order->get_billing_city(),
			'postcode'   => $order->get_billing_postcode(),
			'country'    => $order->get_billing_country(),
			'email'      => $order->get_billing_email(),
			'phone'      => $order->get_billing_phone(),
		);
		$shipping_address = array(
			'first_name' => $order->get_shipping_first_name(),
			'last_name'  => $order->get_shipping_last_name(),
			'company'    => $order->get_shipping_company(),
			'address_1'  => $order->get_shipping_address_1(),
			'address_2'  => $order->get_shipping_address_2(),
			'city'       => $order->get_shipping_city(),
			'postcode'   => $order->get_shipping_postcode(),
			'country'    => $order->get_shipping_country(),
		);

		// Shipping method (first shipping line).
		$shipping_method = null;
		foreach ( $order->get_shipping_methods() as $item ) {
			$shipping_method = array(
				'id'    => (string) $item->get_method_id(),
				'title' => (string) $item->get_name(),
				'total' => self::num( (float) $item->get_total() + ( $incl ? (float) $item->get_total_tax() : 0 ) ),
			);
			break;
		}

		// Pickup point / IČO / DIČ (written by Bohemia_Checkout_Extension).
		$pickup_point = null;
		if ( class_exists( 'Bohemia_Checkout_Extension' ) ) {
			$pickup_point = Bohemia_Checkout_Extension::get_order_pickup_point( $order );
		} else {
			$raw          = $order->get_meta( '_bohemia_packeta_point' );
			$pickup_point = is_array( $raw ) && ! empty( $raw['id'] ) ? $raw : null;
		}

		// Items.
		$items = array();
		foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
			$items[] = self::format_item( $item_id, $item, $incl );
		}

		// Tracking (written by the Zásilkovna module).
		$tracking = null;
		$barcode  = (string) $order->get_meta( '_bohemia_packeta_barcode' );
		$url      = (string) $order->get_meta( '_bohemia_tracking_url' );
		if ( '' !== $barcode || '' !== $url ) {
			if ( '' === $url && '' !== $barcode ) {
				$url = 'https://tracking.packeta.com/cs/?id=' . rawurlencode( $barcode );
			}
			$tracking = array(
				'number' => $barcode,
				'url'    => $url,
			);
		}

		return array(
			'id'              => $order->get_id(),
			'number'          => (string) $order->get_order_number(),
			'order_key'       => (string) $order->get_order_key(),
			'status'          => $order->get_status(),
			'status_label'    => wc_get_order_status_name( $order->get_status() ),
			'date_created'    => self::date( $order->get_date_created() ),
			'currency'        => $order->get_currency(),
			'totals'          => $totals,
			'payment'         => $payment,
			'bacs'            => $bacs,
			'billing'         => $billing,
			'shipping'        => $shipping_address,
			'shipping_method' => $shipping_method,
			'pickup_point'    => $pickup_point,
			'ico'             => (string) $order->get_meta( '_bohemia_ico' ),
			'dic'             => (string) $order->get_meta( '_bohemia_dic' ),
			'items'           => $items,
			'customer_note'   => (string) $order->get_customer_note(),
			'tracking'        => $tracking,
		);
	}

	/**
	 * @param int                   $item_id Order item id.
	 * @param WC_Order_Item_Product $item    Line item.
	 * @param bool                  $incl    Include tax in the line total.
	 */
	private static function format_item( $item_id, $item, $incl ) {
		$product = $item->get_product();
		$image   = '';
		if ( $product ) {
			$image_id = $product->get_image_id();
			if ( ! $image_id && $product->is_type( 'variation' ) ) {
				$parent   = wc_get_product( $product->get_parent_id() );
				$image_id = $parent ? $parent->get_image_id() : 0;
			}
			if ( $image_id ) {
				$image = (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
			}
		}
		if ( '' === $image && function_exists( 'wc_placeholder_img_src' ) ) {
			$image = (string) wc_placeholder_img_src( 'woocommerce_thumbnail' );
		}

		$variation = array();
		foreach ( $item->get_formatted_meta_data( '_', true ) as $meta ) {
			$key   = wp_strip_all_tags( (string) $meta->display_key );
			$value = trim( wp_strip_all_tags( html_entity_decode( (string) $meta->display_value, ENT_QUOTES, 'UTF-8' ) ) );
			if ( '' === $key || '' === $value ) {
				continue;
			}
			$variation[] = array(
				'attribute' => $key,
				'value'     => $value,
			);
		}

		return array(
			'id'           => (int) $item_id,
			'product_id'   => (int) $item->get_product_id(),
			'variation_id' => (int) $item->get_variation_id(),
			'name'         => $item->get_name(),
			'quantity'     => (int) $item->get_quantity(),
			'total'        => self::num( (float) $item->get_total() + ( $incl ? (float) $item->get_total_tax() : 0 ) ),
			'image'        => $image,
			'sku'          => $product ? (string) $product->get_sku() : '',
			'variation'    => $variation,
		);
	}

	/**
	 * Bank accounts configured for the WooCommerce "Direct bank transfer" gateway.
	 */
	private static function bacs_accounts() {
		$accounts = get_option( 'woocommerce_bacs_accounts' );
		if ( ! is_array( $accounts ) || empty( $accounts ) ) {
			$settings = (array) get_option( 'woocommerce_bacs_settings', array() );
			$accounts = array(
				array(
					'account_name'   => isset( $settings['account_name'] ) ? $settings['account_name'] : '',
					'account_number' => isset( $settings['account_number'] ) ? $settings['account_number'] : '',
					'sort_code'      => isset( $settings['sort_code'] ) ? $settings['sort_code'] : '',
					'bank_name'      => isset( $settings['bank_name'] ) ? $settings['bank_name'] : '',
					'iban'           => isset( $settings['iban'] ) ? $settings['iban'] : '',
					'bic'            => isset( $settings['bic'] ) ? $settings['bic'] : '',
				),
			);
		}
		$out = array();
		foreach ( $accounts as $account ) {
			if ( ! is_array( $account ) ) {
				continue;
			}
			$row = array();
			foreach ( array( 'account_name', 'account_number', 'bank_name', 'sort_code', 'iban', 'bic' ) as $field ) {
				$row[ $field ] = isset( $account[ $field ] ) ? wp_unslash( (string) $account[ $field ] ) : '';
			}
			if ( '' === implode( '', $row ) ) {
				continue;
			}
			$out[] = $row;
		}
		return $out;
	}
}

add_action( 'bohemia_wc_init', array( 'Bohemia_Order_Api', 'init' ) );
