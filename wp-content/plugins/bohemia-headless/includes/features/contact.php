<?php
/**
 * Contact form endpoint: POST /wp-json/bohemia/v1/contact { name, email, phone, message, hp } → { status: 'sent' }.
 * Sends the message to Bohemia_Settings::contact_email() with Reply-To set to the sender.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Contact {

	const MAX_MESSAGE_LENGTH = 5000;

	public static function init() {
		add_action( 'bohemia_register_rest_routes', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			BOHEMIA_REST_NS,
			'/contact',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'callback'            => array( __CLASS__, 'handle' ),
				'permission_callback' => '__return_true',
				'args'                => array(
					'name'    => array( 'required' => true, 'type' => 'string' ),
					'email'   => array( 'required' => true, 'type' => 'string' ),
					'phone'   => array( 'type' => 'string', 'default' => '' ),
					'message' => array( 'required' => true, 'type' => 'string' ),
					'hp'      => array( 'type' => 'string', 'default' => '' ),
				),
			)
		);
	}

	public static function handle( WP_REST_Request $request ) {
		// Honeypot filled → pretend success (bots).
		if ( '' !== trim( (string) $request->get_param( 'hp' ) ) ) {
			return rest_ensure_response( array( 'status' => 'sent' ) );
		}

		if ( ! Bohemia_Rest::rate_limit( 'contact', 5, 600 ) ) {
			return Bohemia_Rest::error( 'bohemia_rate_limited', 'Příliš mnoho zpráv, zkuste to prosím později.', 429 );
		}

		$name    = sanitize_text_field( wp_unslash( (string) $request->get_param( 'name' ) ) );
		$email   = sanitize_email( wp_unslash( (string) $request->get_param( 'email' ) ) );
		$phone   = sanitize_text_field( wp_unslash( (string) $request->get_param( 'phone' ) ) );
		$message = trim( sanitize_textarea_field( wp_unslash( (string) $request->get_param( 'message' ) ) ) );

		if ( mb_strlen( $name ) < 2 || mb_strlen( $name ) > 200 ) {
			return Bohemia_Rest::error( 'bohemia_contact_invalid_name', 'Zadejte prosím své jméno.', 400 );
		}
		if ( ! $email || ! is_email( $email ) ) {
			return Bohemia_Rest::error( 'bohemia_contact_invalid_email', 'Zadejte prosím platnou e-mailovou adresu.', 400 );
		}
		if ( mb_strlen( $phone ) > 50 ) {
			return Bohemia_Rest::error( 'bohemia_contact_invalid_phone', 'Telefonní číslo je příliš dlouhé.', 400 );
		}
		if ( mb_strlen( $message ) < 5 ) {
			return Bohemia_Rest::error( 'bohemia_contact_invalid_message', 'Napište prosím zprávu.', 400 );
		}
		if ( mb_strlen( $message ) > self::MAX_MESSAGE_LENGTH ) {
			return Bohemia_Rest::error( 'bohemia_contact_invalid_message', 'Zpráva je příliš dlouhá (max. 5000 znaků).', 400 );
		}

		$to      = Bohemia_Settings::contact_email();
		$site    = wp_specialchars_decode( get_bloginfo( 'name' ), ENT_QUOTES );
		$subject = sprintf( '[%s] Zpráva z kontaktního formuláře – %s', $site, $name );

		$lines = array(
			'Nová zpráva z kontaktního formuláře na webu ' . $site . '.',
			'',
			'Jméno: ' . $name,
			'E-mail: ' . $email,
			'Telefon: ' . ( '' !== $phone ? $phone : '—' ),
			'IP: ' . ( isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '' ),
			'Datum: ' . wp_date( 'j. n. Y H:i' ),
			'',
			'Zpráva:',
			$message,
		);
		// Inputs are already tag-stripped by sanitize_*; the mail is sent as text/plain.
		$body = wp_strip_all_tags( implode( "\n", $lines ) );

		$headers = array(
			'Content-Type: text/plain; charset=UTF-8',
			'Reply-To: ' . self::header_name( $name ) . ' <' . $email . '>',
		);

		$sent = wp_mail( $to, $subject, $body, $headers );
		if ( ! $sent ) {
			return Bohemia_Rest::error( 'bohemia_contact_failed', 'Zprávu se nepodařilo odeslat, zkuste to prosím později nebo nás kontaktujte telefonicky.', 500 );
		}

		/**
		 * Fires after a contact form message has been sent.
		 */
		do_action( 'bohemia_contact_sent', compact( 'name', 'email', 'phone', 'message' ) );

		return rest_ensure_response( array( 'status' => 'sent' ) );
	}

	/**
	 * Strip characters that could break the Reply-To header.
	 */
	private static function header_name( $name ) {
		$name = preg_replace( '/[\r\n<>"]/', '', (string) $name );
		return trim( $name );
	}
}

add_action( 'bohemia_wc_init', array( 'Bohemia_Contact', 'init' ) );
