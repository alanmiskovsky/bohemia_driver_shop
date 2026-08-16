<?php
/**
 * REST API base: bohemia/v1 namespace, shared helpers, public config + newsletter endpoints.
 * Feature modules add routes via the `bohemia_register_rest_routes` action.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Rest {

	public static function register_routes() {
		register_rest_route(
			BOHEMIA_REST_NS,
			'/config',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'callback'            => array( __CLASS__, 'get_config' ),
				'permission_callback' => '__return_true',
			)
		);

		register_rest_route(
			BOHEMIA_REST_NS,
			'/newsletter',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'newsletter_subscribe' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email'  => array( 'required' => true, 'type' => 'string' ),
					'source' => array( 'type' => 'string', 'default' => 'web' ),
					'hp'     => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);

		register_rest_route(
			BOHEMIA_REST_NS,
			'/newsletter/unsubscribe',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'newsletter_unsubscribe' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'email' => array( 'required' => true, 'type' => 'string' ),
					'token' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);

		/**
		 * Feature modules register their routes here.
		 */
		do_action( 'bohemia_register_rest_routes' );
	}

	/* ------------------------------------------------------------------ */
	/* Helpers                                                             */
	/* ------------------------------------------------------------------ */

	public static function error( $code, $message, $status = 400, $data = array() ) {
		return new WP_Error( $code, $message, array_merge( array( 'status' => $status ), $data ) );
	}

	/**
	 * Very small IP based rate limiter (transient backed).
	 *
	 * @return bool true if the request is allowed.
	 */
	public static function rate_limit( $bucket, $max = 5, $window = 300 ) {
		$ip  = isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '0.0.0.0';
		$key = 'bohemia_rl_' . md5( $bucket . '|' . $ip );
		$n   = (int) get_transient( $key );
		if ( $n >= $max ) {
			return false;
		}
		set_transient( $key, $n + 1, $window );
		return true;
	}

	/**
	 * Public, cacheable frontend configuration.
	 */
	public static function get_config() {
		$has_wc = function_exists( 'WC' );

		$payment_methods = array();
		if ( $has_wc && WC()->payment_gateways() ) {
			foreach ( WC()->payment_gateways()->payment_gateways() as $gateway ) {
				if ( 'yes' !== $gateway->enabled ) {
					continue;
				}
				$payment_methods[] = array(
					'id'          => $gateway->id,
					'title'       => $gateway->get_title(),
					'description' => wp_strip_all_tags( $gateway->get_description() ),
				);
			}
		}

		$currency = $has_wc ? get_woocommerce_currency() : 'CZK';

		$config = array(
			'site_name'         => get_bloginfo( 'name' ),
			'site_description'  => get_bloginfo( 'description' ),
			'frontend_url'      => Bohemia_Settings::frontend_url( '' ),
			'currency'          => $currency,
			'currency_symbol'   => $has_wc ? html_entity_decode( get_woocommerce_currency_symbol( $currency ) ) : 'Kč',
			'contact'           => array(
				'email'   => Bohemia_Settings::contact_email(),
				'phone'   => Bohemia_Settings::get( 'contact_phone' ),
				'address' => Bohemia_Settings::get( 'contact_address' ),
			),
			'cod_fee'           => (float) Bohemia_Settings::get( 'cod_fee' ),
			'packeta'           => array(
				'widget_key' => Bohemia_Settings::get( 'packeta_widget_key' ),
				'shipping_method_id' => 'bohemia_zasilkovna',
			),
			'payment_methods'   => $payment_methods,
			'pages'             => Bohemia_Setup::page_slugs(),
			'guest_checkout'    => 'yes' === get_option( 'woocommerce_enable_guest_checkout', 'yes' ),
			'prices_include_tax' => 'yes' === get_option( 'woocommerce_prices_include_tax', 'yes' ),
		);

		/**
		 * Let feature modules append their public config (e.g. Stripe publishable key).
		 */
		$config = apply_filters( 'bohemia_public_config', $config );

		$response = rest_ensure_response( $config );
		$response->header( 'Cache-Control', 'public, max-age=300' );
		return $response;
	}

	public static function newsletter_subscribe( WP_REST_Request $request ) {
		if ( '' !== (string) $request->get_param( 'hp' ) ) {
			// Honeypot filled → pretend success.
			return array( 'status' => 'subscribed' );
		}
		if ( ! self::rate_limit( 'newsletter', 5, 600 ) ) {
			return self::error( 'bohemia_rate_limited', 'Příliš mnoho pokusů, zkuste to prosím později.', 429 );
		}
		$result = Bohemia_Newsletter::subscribe( $request->get_param( 'email' ), $request->get_param( 'source' ) );
		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}

	public static function newsletter_unsubscribe( WP_REST_Request $request ) {
		$result = Bohemia_Newsletter::unsubscribe( $request->get_param( 'email' ), $request->get_param( 'token' ) );
		return is_wp_error( $result ) ? $result : rest_ensure_response( $result );
	}
}
