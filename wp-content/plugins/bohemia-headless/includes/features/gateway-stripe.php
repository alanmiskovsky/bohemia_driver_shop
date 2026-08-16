<?php
/**
 * Payment gateway "Stripe (Bohemia) – platba kartou" (id `bohemia_stripe`) using Stripe Checkout
 * (hosted payment page) – no Stripe SDK required, plain REST calls via wp_remote_*.
 *
 * Flow: process_payment() creates a Checkout Session and returns its URL as redirect
 * (Store API → payment_result.redirect_url). Stripe redirects back to the frontend order
 * confirmation page (`success_url`) or the checkout page (`cancel_url`). The order is marked as
 * paid by the webhook (`POST /wp-json/bohemia/v1/stripe-webhook`) and, as a fallback, by
 * verify-on-return (`GET /wp-json/bohemia/v1/order/{id}/payment-status?key=…`).
 *
 * Order meta: `_bohemia_stripe_session_id`, `_bohemia_stripe_mode` (test|live),
 * `_bohemia_stripe_attempt`, `_bohemia_stripe_payment_intent`.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

function bohemia_define_gateway_stripe() {
	if ( class_exists( 'Bohemia_Gateway_Stripe', false ) || ! class_exists( 'WC_Payment_Gateway' ) ) {
		return;
	}

	class Bohemia_Gateway_Stripe extends WC_Payment_Gateway {

		const ID       = 'bohemia_stripe';
		const API_BASE = 'https://api.stripe.com/v1';
		const LOG_SRC  = 'bohemia-stripe';

		/** Webhook signature tolerance in seconds. */
		const SIGNATURE_TOLERANCE = 300;

		/** @var bool */
		public $testmode = false;

		public function __construct() {
			$this->id                 = self::ID;
			$this->icon               = '';
			$this->has_fields         = false;
			$this->method_title       = 'Stripe (Bohemia) – platba kartou';
			$this->method_description = 'Platba kartou (Apple Pay, Google Pay…) přes hostovanou stránku Stripe Checkout. Zákazník je přesměrován na Stripe a po zaplacení zpět na frontend. Stav platby potvrzuje webhook <code>' . esc_html( rest_url( BOHEMIA_REST_NS . '/stripe-webhook' ) ) . '</code>.';
			$this->supports           = array( 'products' );

			$this->init_form_fields();
			$this->init_settings();

			$this->title       = $this->get_option( 'title', 'Platba kartou online' );
			$this->description = $this->get_option( 'description', 'Bezpečná platba kartou přes Stripe.' );
			$this->testmode    = 'yes' === $this->get_option( 'testmode', 'yes' );

			if ( $this->testmode ) {
				$this->description = trim( $this->description . ' (testovací režim)' );
			}

			add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function init_form_fields() {
			$this->form_fields = array(
				'enabled'              => array(
					'title'   => 'Povolit',
					'type'    => 'checkbox',
					'label'   => 'Povolit platbu kartou přes Stripe',
					'default' => 'no',
				),
				'title'                => array(
					'title'       => 'Název',
					'type'        => 'text',
					'description' => 'Název platební metody zobrazený zákazníkovi.',
					'default'     => 'Platba kartou online',
					'desc_tip'    => true,
				),
				'description'          => array(
					'title'       => 'Popis',
					'type'        => 'textarea',
					'description' => 'Popis zobrazený u platební metody.',
					'default'     => 'Bezpečná platba kartou přes Stripe.',
					'desc_tip'    => true,
				),
				'testmode'             => array(
					'title'       => 'Testovací režim',
					'type'        => 'checkbox',
					'label'       => 'Používat testovací klíče (sandbox)',
					'default'     => 'yes',
					'description' => 'V testovacím režimu použijte testovací kartu 4242 4242 4242 4242.',
				),
				'test_publishable_key' => array(
					'title'       => 'Testovací Publishable key',
					'type'        => 'text',
					'description' => 'pk_test_…',
					'default'     => '',
				),
				'test_secret_key'      => array(
					'title'       => 'Testovací Secret key',
					'type'        => 'password',
					'description' => 'sk_test_…',
					'default'     => '',
				),
				'live_publishable_key' => array(
					'title'       => 'Ostrý Publishable key',
					'type'        => 'text',
					'description' => 'pk_live_…',
					'default'     => '',
				),
				'live_secret_key'      => array(
					'title'       => 'Ostrý Secret key',
					'type'        => 'password',
					'description' => 'sk_live_…',
					'default'     => '',
				),
				'webhook_secret'       => array(
					'title'       => 'Webhook signing secret',
					'type'        => 'password',
					'description' => 'whsec_… – v Stripe Dashboardu vytvořte endpoint <code>' . esc_html( rest_url( BOHEMIA_REST_NS . '/stripe-webhook' ) ) . '</code> s událostmi checkout.session.completed, checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired.',
					'default'     => '',
				),
			);
		}

		/* -------------------------------------------------------------- */
		/* Keys / availability                                            */
		/* -------------------------------------------------------------- */

		public function get_secret_key() {
			return trim( (string) $this->get_option( $this->testmode ? 'test_secret_key' : 'live_secret_key' ) );
		}

		public function get_publishable_key() {
			return trim( (string) $this->get_option( $this->testmode ? 'test_publishable_key' : 'live_publishable_key' ) );
		}

		public function get_webhook_secret() {
			return trim( (string) $this->get_option( 'webhook_secret' ) );
		}

		public function is_available() {
			if ( 'yes' !== $this->enabled || '' === $this->get_secret_key() ) {
				return false;
			}
			return parent::is_available();
		}

		/**
		 * Gateway instance (from WooCommerce's registry when possible, so settings are shared).
		 *
		 * @return Bohemia_Gateway_Stripe
		 */
		public static function instance() {
			static $fallback = null;
			if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
				$gateways = WC()->payment_gateways()->payment_gateways();
				if ( isset( $gateways[ self::ID ] ) && $gateways[ self::ID ] instanceof self ) {
					return $gateways[ self::ID ];
				}
			}
			if ( null === $fallback ) {
				$fallback = new self();
			}
			return $fallback;
		}

		public static function log( $level, $message, $context = array() ) {
			if ( function_exists( 'wc_get_logger' ) ) {
				wc_get_logger()->log( $level, $message, array_merge( array( 'source' => self::LOG_SRC ), $context ) );
			}
		}

		/* -------------------------------------------------------------- */
		/* Stripe HTTP client                                             */
		/* -------------------------------------------------------------- */

		/**
		 * Zero-decimal currencies per Stripe docs.
		 */
		public static function is_zero_decimal( $currency ) {
			return in_array( strtoupper( $currency ), array( 'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF' ), true );
		}

		public static function to_minor_units( $amount, $currency ) {
			return self::is_zero_decimal( $currency ) ? (int) round( (float) $amount ) : (int) round( (float) $amount * 100 );
		}

		/**
		 * Perform a request against the Stripe API.
		 *
		 * @param string      $method  GET|POST
		 * @param string      $path    e.g. /checkout/sessions
		 * @param array       $body    form params (POST) or query args (GET)
		 * @param array       $headers extra headers
		 * @param string|null $secret  secret key override
		 * @return array|WP_Error decoded JSON
		 */
		public function request( $method, $path, array $body = array(), array $headers = array(), $secret = null ) {
			$secret = null === $secret ? $this->get_secret_key() : $secret;
			if ( '' === $secret ) {
				return new WP_Error( 'bohemia_stripe_config', 'Stripe není nakonfigurováno (chybí Secret key).' );
			}

			$url  = self::API_BASE . $path;
			$args = array(
				'method'  => $method,
				'timeout' => 30,
				'headers' => array_merge(
					array(
						'Authorization' => 'Bearer ' . $secret,
						'User-Agent'    => 'BohemiaHeadless/' . BOHEMIA_VERSION . ' WordPress/' . get_bloginfo( 'version' ),
					),
					$headers
				),
			);
			if ( 'GET' === $method ) {
				if ( $body ) {
					$url = add_query_arg( $body, $url );
				}
			} else {
				$args['headers']['Content-Type'] = 'application/x-www-form-urlencoded';
				$args['body']                    = http_build_query( $body, '', '&' );
			}

			$response = wp_remote_request( $url, $args );
			if ( is_wp_error( $response ) ) {
				self::log( 'error', $method . ' ' . $path . ' HTTP error: ' . $response->get_error_message() );
				return new WP_Error( 'bohemia_stripe_http', 'Komunikace se Stripe selhala: ' . $response->get_error_message() );
			}

			$code = (int) wp_remote_retrieve_response_code( $response );
			$data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
			if ( ! is_array( $data ) ) {
				self::log( 'error', $method . ' ' . $path . ' invalid JSON (HTTP ' . $code . ')' );
				return new WP_Error( 'bohemia_stripe_response', 'Stripe vrátil neplatnou odpověď (HTTP ' . $code . ').' );
			}
			if ( $code >= 400 || isset( $data['error'] ) ) {
				$err  = isset( $data['error'] ) && is_array( $data['error'] ) ? $data['error'] : array();
				$msg  = isset( $err['message'] ) ? $err['message'] : 'HTTP ' . $code;
				$type = isset( $err['type'] ) ? $err['type'] : '';
				self::log( 'error', $method . ' ' . $path . ' error (' . $code . ' ' . $type . '): ' . $msg );
				return new WP_Error( 'bohemia_stripe_api', $msg, array( 'status' => $code, 'type' => $type, 'code' => isset( $err['code'] ) ? $err['code'] : '' ) );
			}
			return $data;
		}

		/* -------------------------------------------------------------- */
		/* Checkout Session                                               */
		/* -------------------------------------------------------------- */

		/**
		 * Create a Stripe Checkout Session for the order.
		 *
		 * @return array|WP_Error session object
		 */
		public function create_checkout_session( WC_Order $order ) {
			$attempt = (int) $order->get_meta( '_bohemia_stripe_attempt' ) + 1;
			$order->update_meta_data( '_bohemia_stripe_attempt', $attempt );
			$order->save();

			// Expire a previous, still open session so the order cannot be paid twice.
			$previous = (string) $order->get_meta( '_bohemia_stripe_session_id' );
			if ( '' !== $previous ) {
				$this->request( 'POST', '/checkout/sessions/' . rawurlencode( $previous ) . '/expire' );
			}

			$currency    = strtolower( $order->get_currency() );
			$success_url = $order->get_checkout_order_received_url();
			$success_url = $success_url . ( false === strpos( $success_url, '?' ) ? '?' : '&' ) . 'session_id={CHECKOUT_SESSION_ID}';
			$cancel_url  = Bohemia_Settings::frontend_url( 'checkout?cancelled=1&order=' . $order->get_id() );

			$params = array(
				'mode'                => 'payment',
				'client_reference_id' => (string) $order->get_id(),
				'customer_email'      => $order->get_billing_email(),
				'locale'              => 'cs',
				'success_url'         => $success_url,
				'cancel_url'          => $cancel_url,
				'line_items'          => array(
					array(
						'quantity'   => 1,
						'price_data' => array(
							'currency'     => $currency,
							'unit_amount'  => self::to_minor_units( $order->get_total(), $currency ),
							'product_data' => array(
								'name' => sprintf( 'Objednávka č. %s – %s', $order->get_order_number(), wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ),
							),
						),
					),
				),
				'metadata'            => array(
					'order_id'  => (string) $order->get_id(),
					'order_key' => $order->get_order_key(),
					'site'      => home_url(),
				),
				'payment_intent_data' => array(
					'description' => sprintf( 'Objednávka č. %s – %s', $order->get_order_number(), wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES ) ),
					'metadata'    => array(
						'order_id'  => (string) $order->get_id(),
						'order_key' => $order->get_order_key(),
					),
				),
			);

			/**
			 * Filter the Checkout Session parameters before creation.
			 */
			$params = apply_filters( 'bohemia_stripe_session_params', $params, $order );

			$session = $this->request(
				'POST',
				'/checkout/sessions',
				$params,
				array( 'Idempotency-Key' => $order->get_id() . '-' . $order->get_order_key() . '-' . $attempt )
			);
			if ( is_wp_error( $session ) ) {
				return $session;
			}
			if ( empty( $session['id'] ) || empty( $session['url'] ) ) {
				return new WP_Error( 'bohemia_stripe_response', 'Stripe nevrátil URL platební stránky.' );
			}

			$order->update_meta_data( '_bohemia_stripe_session_id', $session['id'] );
			$order->update_meta_data( '_bohemia_stripe_mode', $this->testmode ? 'test' : 'live' );
			$order->add_order_note( sprintf( 'Stripe: vytvořena platební relace %s (%s režim), částka %s.', $session['id'], $this->testmode ? 'testovací' : 'ostrý', wc_price( $order->get_total(), array( 'currency' => $order->get_currency() ) ) ) );
			$order->save();

			self::log( 'info', sprintf( 'Order #%s: checkout session %s created (attempt %d)', $order->get_order_number(), $session['id'], $attempt ) );

			return $session;
		}

		/**
		 * WooCommerce entry point (classic checkout, Store API via legacy payment processing).
		 *
		 * @throws Exception when the session cannot be created (Store API → 402 with the message; classic checkout → notice).
		 */
		public function process_payment( $order_id ) {
			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				throw new Exception( 'Objednávka nebyla nalezena.' );
			}

			$session = $this->create_checkout_session( $order );
			if ( is_wp_error( $session ) ) {
				$order->add_order_note( 'Stripe: chyba při vytváření platby – ' . $session->get_error_message() );
				$order->save();
				throw new Exception( 'Platbu kartou se nepodařilo zahájit: ' . $session->get_error_message() );
			}

			return array(
				'result'   => 'success',
				'redirect' => $session['url'],
			);
		}

		/* -------------------------------------------------------------- */
		/* Marking orders as paid                                         */
		/* -------------------------------------------------------------- */

		/**
		 * Mark the order as paid from a Stripe Checkout Session object (idempotent).
		 */
		public static function complete_from_session( WC_Order $order, array $session, $source = 'webhook' ) {
			$intent = isset( $session['payment_intent'] ) ? ( is_array( $session['payment_intent'] ) ? $session['payment_intent']['id'] : (string) $session['payment_intent'] ) : '';
			if ( $order->is_paid() ) {
				return true;
			}
			$order->update_meta_data( '_bohemia_stripe_session_id', $session['id'] );
			if ( $intent ) {
				$order->update_meta_data( '_bohemia_stripe_payment_intent', $intent );
			}
			$order->add_order_note( sprintf( 'Stripe: platba přijata (%s). Relace %s%s.', $source, $session['id'], $intent ? ', PaymentIntent ' . $intent : '' ) );
			$order->save();
			$order->payment_complete( $intent );
			self::log( 'info', sprintf( 'Order #%s marked as paid via %s (session %s)', $order->get_order_number(), $source, $session['id'] ) );
			return true;
		}

		/**
		 * Verify-on-return: if the order still awaits payment, ask Stripe whether the session was paid.
		 *
		 * @return bool true if the order is paid (now or already before).
		 */
		public static function sync_order_payment( WC_Order $order ) {
			if ( $order->is_paid() ) {
				return true;
			}
			if ( self::ID !== $order->get_payment_method() || ! $order->needs_payment() ) {
				return false;
			}
			$session_id = (string) $order->get_meta( '_bohemia_stripe_session_id' );
			if ( '' === $session_id ) {
				return false;
			}
			$gateway = self::instance();
			$secret  = $gateway->get_secret_key();
			// Use the key matching the mode the session was created in.
			$mode = (string) $order->get_meta( '_bohemia_stripe_mode' );
			if ( 'test' === $mode ) {
				$secret = trim( (string) $gateway->get_option( 'test_secret_key' ) );
			} elseif ( 'live' === $mode ) {
				$secret = trim( (string) $gateway->get_option( 'live_secret_key' ) );
			}
			$session = $gateway->request( 'GET', '/checkout/sessions/' . rawurlencode( $session_id ), array(), array(), $secret );
			if ( is_wp_error( $session ) ) {
				return false;
			}
			if ( isset( $session['payment_status'] ) && 'paid' === $session['payment_status'] ) {
				self::complete_from_session( $order, $session, 'ověření po návratu' );
				return true;
			}
			return false;
		}

		/* -------------------------------------------------------------- */
		/* Webhook                                                        */
		/* -------------------------------------------------------------- */

		/**
		 * Verify the Stripe-Signature header (t=…,v1=…).
		 */
		public static function verify_signature( $payload, $header, $secret, $tolerance = self::SIGNATURE_TOLERANCE ) {
			if ( '' === $secret || '' === (string) $header ) {
				return false;
			}
			$timestamp  = null;
			$signatures = array();
			foreach ( explode( ',', $header ) as $part ) {
				$kv = explode( '=', trim( $part ), 2 );
				if ( 2 !== count( $kv ) ) {
					continue;
				}
				if ( 't' === $kv[0] ) {
					$timestamp = (int) $kv[1];
				} elseif ( 'v1' === $kv[0] ) {
					$signatures[] = $kv[1];
				}
			}
			if ( ! $timestamp || empty( $signatures ) ) {
				return false;
			}
			if ( $tolerance > 0 && abs( time() - $timestamp ) > $tolerance ) {
				return false;
			}
			$expected = hash_hmac( 'sha256', $timestamp . '.' . $payload, $secret );
			foreach ( $signatures as $sig ) {
				if ( hash_equals( $expected, $sig ) ) {
					return true;
				}
			}
			return false;
		}

		/**
		 * Locate the WooCommerce order referenced by a Checkout Session.
		 *
		 * @return WC_Order|null
		 */
		public static function find_order_from_session( array $session ) {
			$order_id  = isset( $session['metadata']['order_id'] ) ? absint( $session['metadata']['order_id'] ) : 0;
			$order_key = isset( $session['metadata']['order_key'] ) ? (string) $session['metadata']['order_key'] : '';
			if ( ! $order_id && ! empty( $session['client_reference_id'] ) ) {
				$order_id = absint( $session['client_reference_id'] );
			}
			if ( ! $order_id ) {
				return null;
			}
			$order = wc_get_order( $order_id );
			if ( ! $order ) {
				return null;
			}
			if ( '' !== $order_key && ! hash_equals( $order->get_order_key(), $order_key ) ) {
				self::log( 'warning', sprintf( 'Session %s: order key mismatch for order #%d', $session['id'] ?? '?', $order_id ) );
				return null;
			}
			return $order;
		}

		public static function handle_webhook( WP_REST_Request $request ) {
			$gateway = self::instance();
			$payload = (string) $request->get_body();
			$header  = (string) $request->get_header( 'stripe_signature' );
			$secret  = $gateway->get_webhook_secret();

			if ( '' === $secret ) {
				self::log( 'error', 'Webhook rejected: webhook secret is not configured.' );
				return Bohemia_Rest::error( 'bohemia_stripe_webhook_unconfigured', 'Webhook secret není nastaven.', 400 );
			}
			if ( ! self::verify_signature( $payload, $header, $secret ) ) {
				self::log( 'warning', 'Webhook rejected: invalid signature.' );
				return Bohemia_Rest::error( 'bohemia_stripe_bad_signature', 'Neplatný podpis webhooku.', 400 );
			}

			$event = json_decode( $payload, true );
			if ( ! is_array( $event ) || empty( $event['type'] ) ) {
				return Bohemia_Rest::error( 'bohemia_stripe_bad_payload', 'Neplatný obsah webhooku.', 400 );
			}

			$type    = (string) $event['type'];
			$session = isset( $event['data']['object'] ) && is_array( $event['data']['object'] ) ? $event['data']['object'] : array();

			self::log( 'info', sprintf( 'Webhook %s (%s)', $type, $event['id'] ?? '?' ) );

			if ( 0 === strpos( $type, 'checkout.session.' ) && $session ) {
				$order = self::find_order_from_session( $session );
				if ( ! $order ) {
					self::log( 'warning', sprintf( 'Webhook %s: order not found for session %s', $type, $session['id'] ?? '?' ) );
				} elseif ( self::ID !== $order->get_payment_method() ) {
					self::log( 'warning', sprintf( 'Webhook %s: order #%s does not use Stripe', $type, $order->get_order_number() ) );
				} else {
					self::process_session_event( $order, $type, $session );
				}
			}

			return rest_ensure_response( array( 'received' => true ) );
		}

		protected static function process_session_event( WC_Order $order, $type, array $session ) {
			$sid = isset( $session['id'] ) ? $session['id'] : '';
			switch ( $type ) {
				case 'checkout.session.completed':
					if ( isset( $session['payment_status'] ) && 'paid' === $session['payment_status'] ) {
						self::complete_from_session( $order, $session, 'webhook' );
					} else {
						$order->update_meta_data( '_bohemia_stripe_session_id', $sid );
						$order->add_order_note( sprintf( 'Stripe: relace %s dokončena, platba zatím čeká na zpracování (%s).', $sid, isset( $session['payment_status'] ) ? $session['payment_status'] : 'unpaid' ) );
						if ( $order->has_status( 'pending' ) ) {
							$order->update_status( 'on-hold', 'Stripe: čeká se na potvrzení platby.' );
						} else {
							$order->save();
						}
					}
					break;

				case 'checkout.session.async_payment_succeeded':
					self::complete_from_session( $order, $session, 'webhook (asynchronní platba)' );
					break;

				case 'checkout.session.async_payment_failed':
					if ( ! $order->is_paid() ) {
						$order->update_status( 'failed', sprintf( 'Stripe: asynchronní platba selhala (relace %s).', $sid ) );
					}
					break;

				case 'checkout.session.expired':
					if ( $order->is_paid() ) {
						break;
					}
					$current = (string) $order->get_meta( '_bohemia_stripe_session_id' );
					if ( '' !== $current && $sid !== $current ) {
						// An older session expired while a newer one exists – just note it.
						$order->add_order_note( sprintf( 'Stripe: starší platební relace %s vypršela.', $sid ) );
						$order->save();
						break;
					}
					if ( $order->has_status( 'pending' ) ) {
						$order->update_status( 'cancelled', sprintf( 'Stripe: platební relace %s vypršela bez zaplacení.', $sid ) );
					} else {
						$order->add_order_note( sprintf( 'Stripe: platební relace %s vypršela.', $sid ) );
						$order->save();
					}
					break;

				default:
					$order->add_order_note( sprintf( 'Stripe: událost %s (relace %s).', $type, $sid ) );
					$order->save();
			}
		}

		/* -------------------------------------------------------------- */
		/* REST: re-pay + payment status                                  */
		/* -------------------------------------------------------------- */

		public static function register_routes() {
			register_rest_route(
				BOHEMIA_REST_NS,
				'/stripe-webhook',
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'handle_webhook' ),
					'permission_callback' => '__return_true',
				)
			);

			register_rest_route(
				BOHEMIA_REST_NS,
				'/order/(?P<id>\d+)/pay',
				array(
					'methods'             => WP_REST_Server::CREATABLE,
					'callback'            => array( __CLASS__, 'rest_pay' ),
					'permission_callback' => '__return_true',
					'args'                => array(
						'id'  => array( 'required' => true, 'type' => 'integer' ),
						'key' => array( 'required' => true, 'type' => 'string' ),
					),
				)
			);

			register_rest_route(
				BOHEMIA_REST_NS,
				'/order/(?P<id>\d+)/payment-status',
				array(
					'methods'             => WP_REST_Server::READABLE,
					'callback'            => array( __CLASS__, 'rest_payment_status' ),
					'permission_callback' => '__return_true',
					'args'                => array(
						'id'  => array( 'required' => true, 'type' => 'integer' ),
						'key' => array( 'required' => true, 'type' => 'string' ),
					),
				)
			);
		}

		/**
		 * @return WC_Order|WP_Error
		 */
		protected static function rest_order( WP_REST_Request $request ) {
			$order = wc_get_order( absint( $request['id'] ) );
			$key   = (string) $request->get_param( 'key' );
			if ( ! $order || '' === $key || ! hash_equals( $order->get_order_key(), $key ) ) {
				return Bohemia_Rest::error( 'bohemia_forbidden', 'Objednávka nebyla nalezena nebo klíč nesouhlasí.', 403 );
			}
			return $order;
		}

		public static function rest_pay( WP_REST_Request $request ) {
			if ( ! Bohemia_Rest::rate_limit( 'stripe_pay', 10, 300 ) ) {
				return Bohemia_Rest::error( 'bohemia_rate_limited', 'Příliš mnoho pokusů, zkuste to prosím později.', 429 );
			}
			$order = self::rest_order( $request );
			if ( is_wp_error( $order ) ) {
				return $order;
			}

			if ( self::sync_order_payment( $order ) || $order->is_paid() ) {
				return rest_ensure_response( array( 'paid' => true, 'redirect_url' => null ) );
			}
			if ( ! $order->needs_payment() ) {
				return Bohemia_Rest::error( 'bohemia_order_not_payable', 'Objednávku již nelze zaplatit online (stav: ' . wc_get_order_status_name( $order->get_status() ) . ').', 409 );
			}

			$gateway = self::instance();
			if ( 'yes' !== $gateway->enabled || '' === $gateway->get_secret_key() ) {
				return Bohemia_Rest::error( 'bohemia_stripe_unavailable', 'Platba kartou není momentálně dostupná.', 409 );
			}

			if ( self::ID !== $order->get_payment_method() ) {
				$order->set_payment_method( $gateway );
				$order->add_order_note( 'Zákazník zvolil dodatečnou platbu kartou (Stripe).' );
				$order->save();
			}

			$session = $gateway->create_checkout_session( $order );
			if ( is_wp_error( $session ) ) {
				$order->add_order_note( 'Stripe: chyba při vytváření platby – ' . $session->get_error_message() );
				$order->save();
				return Bohemia_Rest::error( 'bohemia_stripe_error', 'Platbu kartou se nepodařilo zahájit: ' . $session->get_error_message(), 502 );
			}

			return rest_ensure_response( array( 'paid' => false, 'redirect_url' => $session['url'] ) );
		}

		public static function rest_payment_status( WP_REST_Request $request ) {
			if ( ! Bohemia_Rest::rate_limit( 'stripe_status', 30, 300 ) ) {
				return Bohemia_Rest::error( 'bohemia_rate_limited', 'Příliš mnoho požadavků, zkuste to prosím později.', 429 );
			}
			$order = self::rest_order( $request );
			if ( is_wp_error( $order ) ) {
				return $order;
			}
			self::sync_order_payment( $order );
			$order = wc_get_order( $order->get_id() );

			$response = rest_ensure_response(
				array(
					'paid'          => $order->is_paid(),
					'status'        => $order->get_status(),
					'needs_payment' => $order->needs_payment(),
				)
			);
			$response->header( 'Cache-Control', 'no-store' );
			return $response;
		}

		/* -------------------------------------------------------------- */
		/* Public config                                                  */
		/* -------------------------------------------------------------- */

		public static function public_config( $config ) {
			$gateway          = self::instance();
			$config['stripe'] = array(
				'publishable_key' => 'yes' === $gateway->enabled ? $gateway->get_publishable_key() : '',
				'testmode'        => (bool) $gateway->testmode,
			);
			return $config;
		}
	}
}

/**
 * Registration with WooCommerce + REST.
 */
class Bohemia_Gateway_Stripe_Loader {

	public static function init() {
		bohemia_define_gateway_stripe();
		add_filter( 'woocommerce_payment_gateways', array( __CLASS__, 'register' ) );
		add_action( 'bohemia_register_rest_routes', array( __CLASS__, 'register_routes' ) );
		add_filter( 'bohemia_public_config', array( __CLASS__, 'public_config' ) );
	}

	public static function register( $gateways ) {
		bohemia_define_gateway_stripe();
		if ( class_exists( 'Bohemia_Gateway_Stripe', false ) ) {
			$gateways[] = 'Bohemia_Gateway_Stripe';
		}
		return $gateways;
	}

	public static function register_routes() {
		if ( class_exists( 'Bohemia_Gateway_Stripe', false ) ) {
			Bohemia_Gateway_Stripe::register_routes();
		}
	}

	public static function public_config( $config ) {
		if ( class_exists( 'Bohemia_Gateway_Stripe', false ) ) {
			return Bohemia_Gateway_Stripe::public_config( $config );
		}
		return $config;
	}
}
add_action( 'bohemia_wc_init', array( 'Bohemia_Gateway_Stripe_Loader', 'init' ) );
