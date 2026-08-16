<?php
/**
 * Point WooCommerce/WordPress generated URLs (e-mails, redirects, permalinks) to the React frontend.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Urls {

	public static function init() {
		add_filter( 'woocommerce_get_checkout_order_received_url', array( __CLASS__, 'order_received_url' ), 10, 2 );
		add_filter( 'woocommerce_get_checkout_payment_url', array( __CLASS__, 'order_pay_url' ), 10, 2 );
		add_filter( 'woocommerce_get_view_order_url', array( __CLASS__, 'view_order_url' ), 10, 2 );
		add_filter( 'woocommerce_get_cancel_order_url', array( __CLASS__, 'cancel_order_url' ), 10, 2 );
		add_filter( 'woocommerce_get_cancel_order_url_raw', array( __CLASS__, 'cancel_order_url' ), 10, 2 );
		add_filter( 'woocommerce_get_cart_url', array( __CLASS__, 'cart_url' ) );
		add_filter( 'woocommerce_get_checkout_url', array( __CLASS__, 'checkout_url' ) );
		add_filter( 'woocommerce_get_myaccount_page_permalink', array( __CLASS__, 'account_url' ) );
		add_filter( 'woocommerce_return_to_shop_redirect', array( __CLASS__, 'shop_url' ) );
		add_filter( 'post_type_link', array( __CLASS__, 'product_permalink' ), 10, 2 );
		add_filter( 'term_link', array( __CLASS__, 'term_permalink' ), 10, 3 );
		add_filter( 'page_link', array( __CLASS__, 'page_permalink' ), 10, 2 );
	}

	public static function order_url( $order, $extra = '' ) {
		return Bohemia_Settings::frontend_url( 'order-confirmation?order=' . $order->get_id() . '&key=' . $order->get_order_key() . $extra );
	}

	public static function order_received_url( $url, $order ) {
		return $order instanceof WC_Order ? self::order_url( $order ) : $url;
	}

	public static function order_pay_url( $url, $order ) {
		return $order instanceof WC_Order ? self::order_url( $order, '&pay=1' ) : $url;
	}

	public static function view_order_url( $url, $order ) {
		return $order instanceof WC_Order ? self::order_url( $order ) : $url;
	}

	public static function cancel_order_url( $url, $order ) {
		if ( ! $order instanceof WC_Order ) {
			return $url;
		}
		return Bohemia_Settings::frontend_url( 'checkout?cancelled=1&order=' . $order->get_id() );
	}

	public static function cart_url() {
		return Bohemia_Settings::frontend_url( 'cart' );
	}

	public static function checkout_url() {
		return Bohemia_Settings::frontend_url( 'checkout' );
	}

	public static function account_url() {
		return Bohemia_Settings::frontend_url( 'account' );
	}

	public static function shop_url() {
		return Bohemia_Settings::frontend_url( '' );
	}

	public static function product_permalink( $link, $post ) {
		if ( $post instanceof WP_Post && 'product' === $post->post_type ) {
			return Bohemia_Settings::frontend_url( 'product/' . $post->ID );
		}
		return $link;
	}

	public static function term_permalink( $link, $term, $taxonomy ) {
		if ( 'product_cat' === $taxonomy ) {
			return Bohemia_Settings::frontend_url( '?category=' . $term->term_id );
		}
		return $link;
	}

	public static function page_permalink( $link, $post_id ) {
		if ( is_admin() && ! wp_doing_ajax() ) {
			return $link;
		}
		$post = get_post( $post_id );
		if ( ! $post || 'page' !== $post->post_type ) {
			return $link;
		}
		return Bohemia_Settings::frontend_url( 'stranka/' . $post->post_name );
	}
}
