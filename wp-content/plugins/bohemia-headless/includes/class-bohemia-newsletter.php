<?php
/**
 * Newsletter subscribers stored as a private custom post type + CSV export + unsubscribe links.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Newsletter {

	const CPT = 'bohemia_subscriber';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'register_cpt' ) );
		add_action( 'admin_post_bohemia_export_subscribers', array( __CLASS__, 'export_csv' ) );
		add_filter( 'manage_' . self::CPT . '_posts_columns', array( __CLASS__, 'columns' ) );
		add_action( 'manage_' . self::CPT . '_posts_custom_column', array( __CLASS__, 'column_content' ), 10, 2 );
	}

	public static function register_cpt() {
		register_post_type(
			self::CPT,
			array(
				'labels'          => array(
					'name'          => 'Odběratelé newsletteru',
					'singular_name' => 'Odběratel',
					'menu_name'     => 'Newsletter',
				),
				'public'          => false,
				'show_ui'         => true,
				'show_in_menu'    => class_exists( 'WooCommerce' ) ? 'woocommerce' : true,
				'show_in_rest'    => false,
				'supports'        => array( 'title' ),
				'capability_type' => 'post',
				'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
				'map_meta_cap'    => true,
				'menu_icon'       => 'dashicons-email-alt',
			)
		);
	}

	/**
	 * Subscribe an e-mail address. Returns array( 'status' => 'subscribed'|'exists' ).
	 */
	public static function subscribe( $email, $source = 'web' ) {
		$email = sanitize_email( $email );
		if ( ! is_email( $email ) ) {
			return new WP_Error( 'bohemia_invalid_email', 'Zadejte platnou e-mailovou adresu.', array( 'status' => 400 ) );
		}
		$existing = self::find_by_email( $email );
		if ( $existing ) {
			if ( 'publish' !== $existing->post_status ) {
				wp_update_post( array( 'ID' => $existing->ID, 'post_status' => 'publish' ) );
				update_post_meta( $existing->ID, '_resubscribed_at', current_time( 'mysql' ) );
				return array( 'status' => 'subscribed' );
			}
			return array( 'status' => 'exists' );
		}
		$id = wp_insert_post(
			array(
				'post_type'   => self::CPT,
				'post_title'  => $email,
				'post_status' => 'publish',
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			return $id;
		}
		update_post_meta( $id, '_source', sanitize_text_field( $source ) );
		update_post_meta( $id, '_ip', self::anonymize_ip( isset( $_SERVER['REMOTE_ADDR'] ) ? $_SERVER['REMOTE_ADDR'] : '' ) );
		update_post_meta( $id, '_token', wp_generate_password( 24, false ) );

		$to = Bohemia_Settings::contact_email();
		if ( $to ) {
			wp_mail( $to, sprintf( '[%s] Nový odběratel newsletteru', get_bloginfo( 'name' ) ), "Nová registrace do newsletteru: {$email}\nZdroj: {$source}" );
		}
		return array( 'status' => 'subscribed' );
	}

	public static function unsubscribe( $email, $token ) {
		$existing = self::find_by_email( sanitize_email( $email ) );
		if ( ! $existing || ! hash_equals( (string) get_post_meta( $existing->ID, '_token', true ), (string) $token ) ) {
			return new WP_Error( 'bohemia_invalid_token', 'Neplatný odkaz pro odhlášení.', array( 'status' => 400 ) );
		}
		wp_update_post( array( 'ID' => $existing->ID, 'post_status' => 'draft' ) );
		update_post_meta( $existing->ID, '_unsubscribed_at', current_time( 'mysql' ) );
		return array( 'status' => 'unsubscribed' );
	}

	private static function find_by_email( $email ) {
		$q = new WP_Query(
			array(
				'post_type'      => self::CPT,
				'post_status'    => array( 'publish', 'draft' ),
				'title'          => $email,
				'posts_per_page' => 1,
				'no_found_rows'  => true,
			)
		);
		return $q->have_posts() ? $q->posts[0] : null;
	}

	private static function anonymize_ip( $ip ) {
		return function_exists( 'wp_privacy_anonymize_ip' ) ? wp_privacy_anonymize_ip( $ip ) : '';
	}

	public static function columns( $columns ) {
		return array(
			'cb'     => $columns['cb'],
			'title'  => 'E-mail',
			'source' => 'Zdroj',
			'date'   => 'Datum',
		);
	}

	public static function column_content( $column, $post_id ) {
		if ( 'source' === $column ) {
			echo esc_html( get_post_meta( $post_id, '_source', true ) );
		}
	}

	public static function export_csv() {
		if ( ! current_user_can( 'manage_options' ) || ! wp_verify_nonce( isset( $_GET['_wpnonce'] ) ? $_GET['_wpnonce'] : '', 'bohemia_export_subscribers' ) ) {
			wp_die( 'Nedostatečná oprávnění.' );
		}
		$posts = get_posts(
			array(
				'post_type'      => self::CPT,
				'post_status'    => 'publish',
				'posts_per_page' => -1,
				'orderby'        => 'date',
				'order'          => 'ASC',
			)
		);
		header( 'Content-Type: text/csv; charset=utf-8' );
		header( 'Content-Disposition: attachment; filename="newsletter-' . gmdate( 'Y-m-d' ) . '.csv"' );
		$out = fopen( 'php://output', 'w' );
		fputcsv( $out, array( 'email', 'source', 'subscribed_at' ) );
		foreach ( $posts as $p ) {
			fputcsv( $out, array( $p->post_title, get_post_meta( $p->ID, '_source', true ), $p->post_date ) );
		}
		fclose( $out );
		exit;
	}
}
