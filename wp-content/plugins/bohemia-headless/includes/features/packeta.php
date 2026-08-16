<?php
/**
 * Zásilkovna / Packeta integration: REST API client (create packet, label PDF, status),
 * order admin meta box + actions, automatic submission, tracking info in e-mails.
 *
 * Order meta used:
 *  - `_bohemia_packeta_point`     pickup point array (written by the checkout extension)
 *  - `_bohemia_packeta_id`        Packeta packet id
 *  - `_bohemia_packeta_barcode`   e.g. Z1234567890
 *  - `_bohemia_tracking_url`      https://tracking.packeta.com/cs/?id=<barcode>
 *  - `_bohemia_packeta_last_error` last API error message (admin info)
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Packeta {

	const API_URL        = 'https://www.zasilkovna.cz/api/rest';
	const TRACKING_URL   = 'https://tracking.packeta.com/cs/?id=';
	const SHIPPING_ID    = 'bohemia_zasilkovna';
	const NOTICE_TRANSIENT = 'bohemia_packeta_notice_';

	public static function init() {
		// Admin: meta box, actions, bulk action, notices.
		add_action( 'add_meta_boxes', array( __CLASS__, 'add_meta_box' ), 10, 2 );
		add_action( 'admin_post_bohemia_packeta_create', array( __CLASS__, 'handle_admin_create' ) );
		add_action( 'admin_post_bohemia_packeta_label', array( __CLASS__, 'handle_admin_label' ) );
		add_action( 'admin_notices', array( __CLASS__, 'admin_notices' ) );

		add_filter( 'woocommerce_order_actions', array( __CLASS__, 'order_actions' ), 10, 2 );
		add_action( 'woocommerce_order_action_bohemia_packeta_submit', array( __CLASS__, 'order_action_submit' ) );

		foreach ( array( 'edit-shop_order', 'woocommerce_page_wc-orders' ) as $screen ) {
			add_filter( 'bulk_actions-' . $screen, array( __CLASS__, 'bulk_actions' ) );
			add_filter( 'handle_bulk_actions-' . $screen, array( __CLASS__, 'handle_bulk_action' ), 10, 3 );
		}

		// Automatic submission.
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'maybe_auto_submit' ), 20 );
		add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'maybe_auto_submit' ), 20 );

		// E-mails.
		add_action( 'woocommerce_email_order_meta', array( __CLASS__, 'email_order_meta' ), 10, 4 );
	}

	/* ------------------------------------------------------------------ */
	/* Helpers                                                             */
	/* ------------------------------------------------------------------ */

	/**
	 * Does the order ship via our Zásilkovna method?
	 *
	 * @param WC_Order|int $order
	 */
	public static function order_uses_packeta( $order ) {
		$order = $order instanceof WC_Order ? $order : wc_get_order( $order );
		if ( ! $order ) {
			return false;
		}
		foreach ( $order->get_shipping_methods() as $item ) {
			if ( self::SHIPPING_ID === $item->get_method_id() ) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Pickup point stored on the order (see contract: id, name, street, city, zip, country, carrier_id, carrier_pickup_point_id, url).
	 *
	 * @return array|null
	 */
	public static function get_pickup_point( WC_Order $order ) {
		$point = $order->get_meta( '_bohemia_packeta_point' );
		if ( is_string( $point ) && '' !== $point ) {
			$decoded = json_decode( $point, true );
			$point   = is_array( $decoded ) ? $decoded : maybe_unserialize( $point );
		}
		if ( ! is_array( $point ) || empty( $point['id'] ) ) {
			return null;
		}
		return $point;
	}

	public static function get_packet_id( WC_Order $order ) {
		return (string) $order->get_meta( '_bohemia_packeta_id' );
	}

	public static function tracking_url( $barcode ) {
		return self::TRACKING_URL . rawurlencode( $barcode );
	}

	/**
	 * Packet weight in kg: sum of product weights, else the configured default.
	 */
	public static function order_weight( WC_Order $order ) {
		$weight = 0.0;
		foreach ( $order->get_items() as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product ) {
				continue;
			}
			$product = $item->get_product();
			if ( ! $product ) {
				continue;
			}
			$w = $product->get_weight();
			if ( '' === $w || null === $w ) {
				continue;
			}
			$weight += (float) wc_get_weight( (float) $w, 'kg' ) * (int) $item->get_quantity();
		}
		if ( $weight <= 0 ) {
			$weight = (float) str_replace( ',', '.', (string) Bohemia_Settings::get( 'packeta_default_weight' ) );
		}
		if ( $weight <= 0 ) {
			$weight = 1.0;
		}
		return round( $weight, 3 );
	}

	/**
	 * Split a full name into first name / surname when the order lacks a first/last name.
	 */
	protected static function order_names( WC_Order $order ) {
		$first = $order->get_shipping_first_name() ? $order->get_shipping_first_name() : $order->get_billing_first_name();
		$last  = $order->get_shipping_last_name() ? $order->get_shipping_last_name() : $order->get_billing_last_name();
		return array( trim( (string) $first ), trim( (string) $last ) );
	}

	/* ------------------------------------------------------------------ */
	/* API client                                                          */
	/* ------------------------------------------------------------------ */

	protected static function xml_escape( $value ) {
		return htmlspecialchars( (string) $value, ENT_XML1 | ENT_QUOTES, 'UTF-8' );
	}

	/**
	 * Build a simple XML document from a nested array (keys = tag names).
	 */
	protected static function build_xml( $tag, $data ) {
		$xml = '<' . $tag . '>';
		foreach ( $data as $key => $value ) {
			if ( null === $value ) {
				continue;
			}
			if ( is_array( $value ) ) {
				$xml .= self::build_xml( $key, $value );
			} else {
				$xml .= '<' . $key . '>' . self::xml_escape( $value ) . '</' . $key . '>';
			}
		}
		return $xml . '</' . $tag . '>';
	}

	/**
	 * POST an XML request to the Packeta REST API and parse the response.
	 *
	 * @param string $method  API method (root element), e.g. createPacket.
	 * @param array  $params  Child elements (apiPassword is added automatically).
	 * @return SimpleXMLElement|WP_Error Parsed <response> on status ok, WP_Error otherwise.
	 */
	public static function api_call( $method, array $params ) {
		$password = (string) Bohemia_Settings::get( 'packeta_api_password' );
		if ( '' === $password ) {
			return new WP_Error( 'bohemia_packeta_config', 'Není nastaveno API heslo Zásilkovny (WooCommerce ▸ Bohemia Shop).' );
		}

		$body = '<?xml version="1.0" encoding="utf-8"?>' . self::build_xml( $method, array_merge( array( 'apiPassword' => $password ), $params ) );

		$response = wp_remote_post(
			self::API_URL,
			array(
				'timeout' => 20,
				'headers' => array( 'Content-Type' => 'text/xml; charset=utf-8' ),
				'body'    => $body,
			)
		);

		if ( is_wp_error( $response ) ) {
			self::log( 'error', $method . ' HTTP error: ' . $response->get_error_message() );
			return new WP_Error( 'bohemia_packeta_http', 'Komunikace se Zásilkovnou selhala: ' . $response->get_error_message() );
		}

		$raw = (string) wp_remote_retrieve_body( $response );

		$previous = libxml_use_internal_errors( true );
		$xml      = simplexml_load_string( $raw );
		libxml_clear_errors();
		libxml_use_internal_errors( $previous );

		if ( ! $xml instanceof SimpleXMLElement ) {
			self::log( 'error', $method . ' invalid XML response (HTTP ' . wp_remote_retrieve_response_code( $response ) . '): ' . substr( $raw, 0, 500 ) );
			return new WP_Error( 'bohemia_packeta_response', 'Zásilkovna vrátila neplatnou odpověď (HTTP ' . wp_remote_retrieve_response_code( $response ) . ').' );
		}

		$status = (string) $xml->status;
		if ( 'ok' === $status ) {
			return $xml;
		}

		// Fault: <status>fault</status><fault>PacketAttributesFault</fault><string>…</string><detail>…</detail>
		$fault   = (string) $xml->fault;
		$message = (string) $xml->string;
		$details = array();
		if ( isset( $xml->detail ) ) {
			// <detail><attributes><fault><name>weight</name><fault>…</fault></fault>…</attributes></detail>
			if ( isset( $xml->detail->attributes->fault ) ) {
				foreach ( $xml->detail->attributes->fault as $f ) {
					$name = isset( $f->name ) ? (string) $f->name : '';
					$text = isset( $f->fault ) ? (string) $f->fault : (string) $f;
					if ( '' === trim( $text ) ) {
						continue;
					}
					$details[] = ( $name ? $name . ': ' : '' ) . $text;
				}
			}
			if ( empty( $details ) ) {
				$plain = trim( wp_strip_all_tags( $xml->detail->asXML() ) );
				if ( '' !== $plain ) {
					$details[] = $plain;
				}
			}
		}
		$details = array_unique( $details );

		$full = trim( $fault . ( $message ? ' – ' . $message : '' ) . ( $details ? ' (' . implode( '; ', $details ) . ')' : '' ) );
		if ( '' === $full ) {
			$full = 'Neznámá chyba Zásilkovny.';
		}
		self::log( 'warning', $method . ' fault: ' . $full );

		return new WP_Error( 'bohemia_packeta_fault', $full, array( 'fault' => $fault, 'details' => $details ) );
	}

	/**
	 * Create a packet in Packeta for the given order. Stores ids on success.
	 *
	 * @return array|WP_Error array( 'id' => …, 'barcode' => …, 'tracking_url' => … )
	 */
	public static function create_packet( WC_Order $order ) {
		if ( ! self::order_uses_packeta( $order ) ) {
			return new WP_Error( 'bohemia_packeta_not_applicable', 'Objednávka není doručována Zásilkovnou.' );
		}
		$existing = self::get_packet_id( $order );
		if ( '' !== $existing ) {
			return new WP_Error( 'bohemia_packeta_exists', 'Zásilka již byla vytvořena (ID ' . $existing . ').' );
		}
		$point = self::get_pickup_point( $order );
		if ( ! $point ) {
			return self::fail( $order, new WP_Error( 'bohemia_packeta_no_point', 'Objednávka nemá vybrané výdejní místo.' ) );
		}

		list( $first, $last ) = self::order_names( $order );
		$total    = (float) $order->get_total();
		$currency = $order->get_currency();
		$is_cod   = 'cod' === $order->get_payment_method();
		$cod      = $is_cod ? ( 'CZK' === $currency ? round( $total ) : round( $total, 2 ) ) : 0;

		$attributes = array(
			'number'   => (string) $order->get_order_number(),
			'name'     => $first,
			'surname'  => $last,
			'email'    => $order->get_billing_email(),
			'phone'    => $order->get_billing_phone(),
			'currency' => $currency,
			'value'    => 'CZK' === $currency ? round( $total ) : round( $total, 2 ),
			'cod'      => $cod,
			'weight'   => self::order_weight( $order ),
			'eshop'    => (string) Bohemia_Settings::get( 'packeta_sender' ),
		);

		if ( ! empty( $point['carrier_id'] ) ) {
			// External carrier pickup point: addressId = carrier id, carrierPickupPoint = carrier's point id.
			$attributes['addressId']          = (string) $point['carrier_id'];
			$attributes['carrierPickupPoint'] = (string) ( ! empty( $point['carrier_pickup_point_id'] ) ? $point['carrier_pickup_point_id'] : $point['id'] );
		} else {
			$attributes['addressId'] = (string) $point['id'];
		}

		if ( '' === $attributes['eshop'] ) {
			unset( $attributes['eshop'] );
		}

		/**
		 * Allow tweaking packet attributes before submission.
		 */
		$attributes = apply_filters( 'bohemia_packeta_packet_attributes', $attributes, $order, $point );

		$xml = self::api_call( 'createPacket', array( 'packetAttributes' => $attributes ) );
		if ( is_wp_error( $xml ) ) {
			return self::fail( $order, $xml );
		}

		$id      = (string) $xml->result->id;
		$barcode = (string) $xml->result->barcode;
		if ( '' === $id ) {
			return self::fail( $order, new WP_Error( 'bohemia_packeta_response', 'Zásilkovna nevrátila ID zásilky.' ) );
		}
		if ( '' === $barcode ) {
			$barcode = 'Z' . $id;
		}
		$tracking = self::tracking_url( $barcode );

		$order->update_meta_data( '_bohemia_packeta_id', $id );
		$order->update_meta_data( '_bohemia_packeta_barcode', $barcode );
		$order->update_meta_data( '_bohemia_tracking_url', $tracking );
		$order->delete_meta_data( '_bohemia_packeta_last_error' );
		$order->add_order_note( sprintf( 'Zásilka odeslána do Zásilkovny. ID: %s, čárový kód: %s, sledování: %s', $id, $barcode, $tracking ) );
		$order->save();

		self::log( 'info', sprintf( 'Order #%s: packet %s (%s) created', $order->get_order_number(), $id, $barcode ) );

		/**
		 * Fires after a packet has been created in Packeta.
		 */
		do_action( 'bohemia_packeta_packet_created', $order, $id, $barcode );

		return array( 'id' => $id, 'barcode' => $barcode, 'tracking_url' => $tracking );
	}

	/**
	 * Store the error on the order (meta + note) and pass it through.
	 */
	protected static function fail( WC_Order $order, WP_Error $error ) {
		$order->update_meta_data( '_bohemia_packeta_last_error', $error->get_error_message() );
		$order->add_order_note( 'Zásilkovna – chyba: ' . $error->get_error_message() );
		$order->save();
		return $error;
	}

	/**
	 * Download the label PDF (A6) for a packet.
	 *
	 * @return string|WP_Error Binary PDF.
	 */
	public static function get_label_pdf( $packet_id, $format = 'A6 on A6', $offset = 0 ) {
		$xml = self::api_call(
			'packetLabelPdf',
			array(
				'packetId' => (string) $packet_id,
				'format'   => $format,
				'offset'   => (int) $offset,
			)
		);
		if ( is_wp_error( $xml ) ) {
			return $xml;
		}
		$pdf = base64_decode( (string) $xml->result, true );
		if ( false === $pdf || '' === $pdf ) {
			return new WP_Error( 'bohemia_packeta_response', 'Zásilkovna nevrátila platný štítek.' );
		}
		return $pdf;
	}

	/**
	 * Current status of a packet.
	 *
	 * @return array|WP_Error array( 'code' => …, 'text' => …, 'status_text' => …, 'date' => …, 'branch_id' => … )
	 */
	public static function packet_status( $packet_id ) {
		$xml = self::api_call( 'packetStatus', array( 'packetId' => (string) $packet_id ) );
		if ( is_wp_error( $xml ) ) {
			return $xml;
		}
		$r = $xml->result;
		return array(
			'code'        => (string) $r->statusCode,
			'text'        => (string) $r->codeText,
			'status_text' => (string) $r->statusText,
			'date'        => (string) $r->dateTime,
			'branch_id'   => (string) $r->branchId,
		);
	}

	protected static function log( $level, $message ) {
		if ( function_exists( 'wc_get_logger' ) ) {
			wc_get_logger()->log( $level, $message, array( 'source' => 'bohemia-packeta' ) );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Automatic submission                                                */
	/* ------------------------------------------------------------------ */

	public static function maybe_auto_submit( $order_id ) {
		if ( 'yes' !== Bohemia_Settings::get( 'packeta_auto_submit' ) ) {
			return;
		}
		$order = wc_get_order( $order_id );
		if ( ! $order || ! self::order_uses_packeta( $order ) || '' !== self::get_packet_id( $order ) ) {
			return;
		}
		if ( ! self::get_pickup_point( $order ) ) {
			return;
		}
		$result = self::create_packet( $order );
		if ( is_wp_error( $result ) ) {
			self::log( 'warning', sprintf( 'Order #%s auto submit failed: %s', $order->get_order_number(), $result->get_error_message() ) );
		}
	}

	/* ------------------------------------------------------------------ */
	/* Admin: meta box                                                     */
	/* ------------------------------------------------------------------ */

	protected static function order_screen_id() {
		if ( class_exists( \Automattic\WooCommerce\Utilities\OrderUtil::class )
			&& \Automattic\WooCommerce\Utilities\OrderUtil::custom_orders_table_usage_is_enabled()
			&& function_exists( 'wc_get_page_screen_id' ) ) {
			return wc_get_page_screen_id( 'shop-order' );
		}
		return 'shop_order';
	}

	public static function add_meta_box( $post_type, $post_or_order = null ) {
		$screen = self::order_screen_id();
		if ( $post_type !== $screen && 'shop_order' !== $post_type ) {
			return;
		}
		$order = self::order_from_object( $post_or_order );
		if ( ! $order || ! self::order_uses_packeta( $order ) ) {
			return;
		}
		add_meta_box( 'bohemia_packeta', 'Zásilkovna', array( __CLASS__, 'render_meta_box' ), $screen, 'side', 'high' );
	}

	protected static function order_from_object( $object ) {
		if ( $object instanceof WC_Order ) {
			return $object;
		}
		if ( $object instanceof WP_Post ) {
			return wc_get_order( $object->ID );
		}
		if ( is_numeric( $object ) ) {
			return wc_get_order( (int) $object );
		}
		return null;
	}

	public static function render_meta_box( $object ) {
		$order = self::order_from_object( $object );
		if ( ! $order ) {
			return;
		}
		$point      = self::get_pickup_point( $order );
		$packet_id  = self::get_packet_id( $order );
		$barcode    = (string) $order->get_meta( '_bohemia_packeta_barcode' );
		$tracking   = (string) $order->get_meta( '_bohemia_tracking_url' );
		$last_error = (string) $order->get_meta( '_bohemia_packeta_last_error' );
		$can        = current_user_can( 'manage_woocommerce' );

		echo '<div class="bohemia-packeta-box">';

		echo '<p><strong>Výdejní místo</strong><br>';
		if ( $point ) {
			$addr = array_filter( array( $point['street'] ?? '', trim( ( $point['zip'] ?? '' ) . ' ' . ( $point['city'] ?? '' ) ), $point['country'] ?? '' ) );
			echo esc_html( $point['name'] ?? '' ) . '<br>';
			echo esc_html( implode( ', ', $addr ) ) . '<br>';
			echo '<span style="color:#666">ID: ' . esc_html( $point['id'] );
			if ( ! empty( $point['carrier_id'] ) ) {
				echo ' · dopravce ' . esc_html( $point['carrier_id'] ) . ' / ' . esc_html( $point['carrier_pickup_point_id'] ?? '' );
			}
			echo '</span>';
			if ( ! empty( $point['url'] ) ) {
				echo '<br><a href="' . esc_url( $point['url'] ) . '" target="_blank" rel="noopener">Detail místa</a>';
			}
		} else {
			echo '<em style="color:#b32d2e">Není vybráno.</em>';
		}
		echo '</p>';

		if ( '' !== $packet_id ) {
			echo '<p><strong>Zásilka</strong><br>';
			echo 'ID: ' . esc_html( $packet_id ) . '<br>';
			echo 'Čárový kód: <code>' . esc_html( $barcode ) . '</code><br>';
			if ( $tracking ) {
				echo '<a href="' . esc_url( $tracking ) . '" target="_blank" rel="noopener">Sledovat zásilku</a>';
			}
			echo '</p>';
			if ( $can ) {
				$label_url = wp_nonce_url(
					admin_url( 'admin-post.php?action=bohemia_packeta_label&order_id=' . $order->get_id() ),
					'bohemia_packeta_label_' . $order->get_id()
				);
				echo '<p><a class="button button-primary" href="' . esc_url( $label_url ) . '" target="_blank">Stáhnout štítek (PDF)</a></p>';
			}
		} elseif ( $can ) {
			$create_url = wp_nonce_url(
				admin_url( 'admin-post.php?action=bohemia_packeta_create&order_id=' . $order->get_id() ),
				'bohemia_packeta_create_' . $order->get_id()
			);
			$disabled = $point ? '' : ' disabled="disabled" onclick="return false;"';
			echo '<p><a class="button button-primary" href="' . esc_url( $create_url ) . '"' . $disabled . '>Odeslat do Zásilkovny</a></p>';
			if ( '' === (string) Bohemia_Settings::get( 'packeta_api_password' ) ) {
				echo '<p class="description" style="color:#b32d2e">Chybí API heslo Zásilkovny – doplňte v <a href="' . esc_url( admin_url( 'admin.php?page=bohemia-settings' ) ) . '">nastavení</a>.</p>';
			}
		}

		if ( '' !== $last_error && '' === $packet_id ) {
			echo '<p style="color:#b32d2e"><strong>Poslední chyba:</strong><br>' . esc_html( $last_error ) . '</p>';
		}

		echo '</div>';
	}

	/* ------------------------------------------------------------------ */
	/* Admin: actions                                                      */
	/* ------------------------------------------------------------------ */

	protected static function set_notice( $type, $message ) {
		set_transient( self::NOTICE_TRANSIENT . get_current_user_id(), array( 'type' => $type, 'message' => $message ), 120 );
	}

	public static function admin_notices() {
		$key    = self::NOTICE_TRANSIENT . get_current_user_id();
		$notice = get_transient( $key );
		if ( ! $notice || ! is_array( $notice ) ) {
			return;
		}
		delete_transient( $key );
		printf(
			'<div class="notice notice-%s is-dismissible"><p><strong>Zásilkovna:</strong> %s</p></div>',
			esc_attr( 'error' === $notice['type'] ? 'error' : 'success' ),
			wp_kses_post( $notice['message'] )
		);
	}

	protected static function redirect_to_order( WC_Order $order ) {
		wp_safe_redirect( $order->get_edit_order_url() );
		exit;
	}

	public static function handle_admin_create() {
		$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
		if ( ! current_user_can( 'manage_woocommerce' ) || ! $order_id ) {
			wp_die( 'Nemáte oprávnění.', '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bohemia_packeta_create_' . $order_id );
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			wp_die( 'Objednávka nenalezena.', '', array( 'response' => 404 ) );
		}
		$result = self::create_packet( $order );
		if ( is_wp_error( $result ) ) {
			self::set_notice( 'error', esc_html( $result->get_error_message() ) );
		} else {
			self::set_notice( 'success', sprintf( 'Zásilka vytvořena, čárový kód %s.', esc_html( $result['barcode'] ) ) );
		}
		self::redirect_to_order( $order );
	}

	public static function handle_admin_label() {
		$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
		if ( ! current_user_can( 'manage_woocommerce' ) || ! $order_id ) {
			wp_die( 'Nemáte oprávnění.', '', array( 'response' => 403 ) );
		}
		check_admin_referer( 'bohemia_packeta_label_' . $order_id );
		$order = wc_get_order( $order_id );
		if ( ! $order ) {
			wp_die( 'Objednávka nenalezena.', '', array( 'response' => 404 ) );
		}
		$packet_id = self::get_packet_id( $order );
		if ( '' === $packet_id ) {
			self::set_notice( 'error', 'Objednávka zatím nemá zásilku v Zásilkovně.' );
			self::redirect_to_order( $order );
		}
		$pdf = self::get_label_pdf( $packet_id );
		if ( is_wp_error( $pdf ) ) {
			self::set_notice( 'error', esc_html( $pdf->get_error_message() ) );
			self::redirect_to_order( $order );
		}
		$barcode  = (string) $order->get_meta( '_bohemia_packeta_barcode' );
		$filename = 'zasilkovna-' . ( $barcode ? $barcode : $packet_id ) . '.pdf';

		nocache_headers();
		header( 'Content-Type: application/pdf' );
		header( 'Content-Disposition: inline; filename="' . $filename . '"' );
		header( 'Content-Length: ' . strlen( $pdf ) );
		echo $pdf; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
		exit;
	}

	/**
	 * Order actions dropdown (order edit screen).
	 */
	public static function order_actions( $actions, $order = null ) {
		if ( ! $order instanceof WC_Order ) {
			global $theorder;
			$order = $theorder instanceof WC_Order ? $theorder : null;
		}
		if ( $order && self::order_uses_packeta( $order ) && '' === self::get_packet_id( $order ) ) {
			$actions['bohemia_packeta_submit'] = 'Odeslat do Zásilkovny';
		}
		return $actions;
	}

	public static function order_action_submit( $order ) {
		if ( ! $order instanceof WC_Order ) {
			return;
		}
		$result = self::create_packet( $order );
		if ( is_wp_error( $result ) ) {
			self::set_notice( 'error', esc_html( $result->get_error_message() ) );
		} else {
			self::set_notice( 'success', sprintf( 'Zásilka vytvořena, čárový kód %s.', esc_html( $result['barcode'] ) ) );
		}
	}

	/**
	 * Bulk action on the orders list.
	 */
	public static function bulk_actions( $actions ) {
		$actions['bohemia_packeta_submit'] = 'Odeslat do Zásilkovny';
		return $actions;
	}

	public static function handle_bulk_action( $redirect_to, $action, $ids ) {
		if ( 'bohemia_packeta_submit' !== $action ) {
			return $redirect_to;
		}
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return $redirect_to;
		}
		$ok      = 0;
		$skipped = 0;
		$errors  = array();
		foreach ( (array) $ids as $id ) {
			$order = wc_get_order( absint( $id ) );
			if ( ! $order || ! self::order_uses_packeta( $order ) || '' !== self::get_packet_id( $order ) ) {
				$skipped++;
				continue;
			}
			$result = self::create_packet( $order );
			if ( is_wp_error( $result ) ) {
				$errors[] = '#' . $order->get_order_number() . ': ' . $result->get_error_message();
			} else {
				$ok++;
			}
		}
		$msg = sprintf( 'Vytvořeno zásilek: %d, přeskočeno: %d.', $ok, $skipped );
		if ( $errors ) {
			$msg .= ' Chyby: ' . implode( ' | ', array_map( 'esc_html', $errors ) );
		}
		self::set_notice( $errors ? 'error' : 'success', $msg );
		return remove_query_arg( array( 'bohemia_packeta' ), $redirect_to );
	}

	/* ------------------------------------------------------------------ */
	/* E-mails                                                             */
	/* ------------------------------------------------------------------ */

	public static function email_order_meta( $order, $sent_to_admin = false, $plain_text = false, $email = null ) {
		if ( ! $order instanceof WC_Order || ! self::order_uses_packeta( $order ) ) {
			return;
		}
		$point    = self::get_pickup_point( $order );
		$barcode  = (string) $order->get_meta( '_bohemia_packeta_barcode' );
		$tracking = (string) $order->get_meta( '_bohemia_tracking_url' );
		if ( ! $point && '' === $barcode ) {
			return;
		}

		if ( $plain_text ) {
			echo "\n";
			if ( $point ) {
				echo "Výdejní místo Zásilkovny: " . $point['name'] . ', ' . trim( ( $point['street'] ?? '' ) . ', ' . ( $point['zip'] ?? '' ) . ' ' . ( $point['city'] ?? '' ), ', ' ) . "\n";
			}
			if ( '' !== $barcode ) {
				echo 'Číslo zásilky: ' . $barcode . "\n";
				if ( $tracking ) {
					echo 'Sledování zásilky: ' . $tracking . "\n";
				}
			}
			echo "\n";
			return;
		}

		echo '<div style="margin-bottom:24px">';
		echo '<h2>Doručení Zásilkovnou</h2>';
		if ( $point ) {
			echo '<p><strong>Výdejní místo:</strong><br>' . esc_html( $point['name'] ) . '<br>' . esc_html( trim( ( $point['street'] ?? '' ) . ', ' . ( $point['zip'] ?? '' ) . ' ' . ( $point['city'] ?? '' ), ', ' ) ) . '</p>';
		}
		if ( '' !== $barcode ) {
			echo '<p><strong>Číslo zásilky:</strong> ' . esc_html( $barcode );
			if ( $tracking ) {
				echo '<br><a href="' . esc_url( $tracking ) . '">Sledovat zásilku</a>';
			}
			echo '</p>';
		}
		echo '</div>';
	}
}
add_action( 'bohemia_wc_init', array( 'Bohemia_Packeta', 'init' ) );
