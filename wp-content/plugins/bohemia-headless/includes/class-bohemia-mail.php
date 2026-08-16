<?php
/**
 * SMTP configuration from environment / constants:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE (tls|ssl|""), SMTP_FROM, SMTP_FROM_NAME.
 *
 * Handy for local development with Mailpit and for production without a dedicated SMTP plugin.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Mail {

	public static function init() {
		if ( ! self::env( 'SMTP_HOST' ) ) {
			return;
		}
		add_action( 'phpmailer_init', array( __CLASS__, 'configure' ) );
		if ( self::env( 'SMTP_FROM' ) ) {
			add_filter( 'wp_mail_from', array( __CLASS__, 'from' ) );
		}
		if ( self::env( 'SMTP_FROM_NAME' ) ) {
			add_filter( 'wp_mail_from_name', array( __CLASS__, 'from_name' ) );
		}
	}

	public static function from() {
		return self::env( 'SMTP_FROM' );
	}

	public static function from_name() {
		return self::env( 'SMTP_FROM_NAME' );
	}

	private static function env( $key ) {
		if ( defined( $key ) ) {
			return constant( $key );
		}
		$v = getenv( $key );
		return false === $v ? '' : $v;
	}

	public static function configure( $phpmailer ) {
		$phpmailer->isSMTP();
		$phpmailer->Host = self::env( 'SMTP_HOST' );
		$phpmailer->Port = (int) ( self::env( 'SMTP_PORT' ) ? self::env( 'SMTP_PORT' ) : 25 );
		$user            = self::env( 'SMTP_USER' );
		if ( $user ) {
			$phpmailer->SMTPAuth = true;
			$phpmailer->Username = $user;
			$phpmailer->Password = self::env( 'SMTP_PASS' );
		} else {
			$phpmailer->SMTPAuth = false;
		}
		$secure = self::env( 'SMTP_SECURE' );
		if ( in_array( $secure, array( 'tls', 'ssl' ), true ) ) {
			$phpmailer->SMTPSecure = $secure;
		} else {
			$phpmailer->SMTPSecure  = '';
			$phpmailer->SMTPAutoTLS = false;
		}
	}
}
