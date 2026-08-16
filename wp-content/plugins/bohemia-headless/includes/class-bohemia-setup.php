<?php
/**
 * One-time store defaults for a fresh installation (currency, gateways, shipping zone, legal pages).
 *
 * Runs after activation (option `bohemia_run_setup`) or via `wp bohemia setup [--force]`.
 * Every step is idempotent and never overwrites existing configuration unless --force is used.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Setup {

	const DONE_OPTION = 'bohemia_setup_done';

	public static function init() {
		add_action( 'init', array( __CLASS__, 'maybe_run' ), 50 );
		if ( defined( 'WP_CLI' ) && WP_CLI ) {
			WP_CLI::add_command( 'bohemia setup', array( __CLASS__, 'cli_setup' ) );
		}
	}

	/**
	 * Slugs of the static pages the frontend links to.
	 */
	public static function page_slugs() {
		return array(
			'terms'    => 'obchodni-podminky',
			'privacy'  => 'ochrana-osobnich-udaju',
			'returns'  => 'reklamacni-rad',
			'about'    => 'o-nas',
			'contact'  => 'kontakt',
			'shipping' => 'doprava-a-platba',
		);
	}

	public static function pages() {
		$slugs = self::page_slugs();
		return array(
			$slugs['terms']    => array( 'Obchodní podmínky', '<p>Zde doplňte obchodní podmínky e-shopu (identifikace prodávajícího, uzavření smlouvy, ceny a platba, dodání, odstoupení od smlouvy do 14 dnů, práva z vadného plnění, řešení sporů – ČOI).</p>' ),
			$slugs['privacy']  => array( 'Ochrana osobních údajů', '<p>Zde doplňte informace o zpracování osobních údajů dle GDPR (správce, účely a právní základy zpracování, příjemci – dopravci a platební brána, doba uchování, práva subjektů údajů, cookies).</p>' ),
			$slugs['returns']  => array( 'Reklamační řád', '<p>Zde doplňte reklamační řád (lhůty, postup uplatnění reklamace, adresa pro zaslání zboží, vyřízení do 30 dnů).</p>' ),
			$slugs['about']    => array( 'O nás', '<p>Bohemia Driver – text o společnosti.</p>' ),
			$slugs['contact']  => array( 'Kontakt', '<p>Kontaktní údaje doplňte v nastavení <em>WooCommerce ▸ Bohemia Shop</em>; tato stránka může obsahovat doplňující text (otevírací doba, mapa…).</p>' ),
			$slugs['shipping'] => array( 'Doprava a platba', '<p>Zásilkovna – výdejní místo, PPL – doručení na adresu, osobní odběr. Platba kartou online, bankovním převodem nebo dobírkou.</p>' ),
		);
	}

	public static function maybe_run() {
		if ( ! get_option( 'bohemia_run_setup' ) ) {
			return;
		}
		delete_option( 'bohemia_run_setup' );
		if ( get_option( self::DONE_OPTION ) ) {
			return;
		}
		self::run( false );
	}

	public static function cli_setup( $args, $assoc_args ) {
		$force = ! empty( $assoc_args['force'] );
		$log   = self::run( $force );
		foreach ( $log as $line ) {
			WP_CLI::log( $line );
		}
		WP_CLI::success( 'Bohemia setup finished.' );
	}

	/**
	 * @return string[] log lines
	 */
	public static function run( $force = false ) {
		$log = array();

		// --- General store settings -------------------------------------------------
		$defaults = array(
			'woocommerce_currency'                 => 'CZK',
			'woocommerce_currency_pos'             => 'right_space',
			'woocommerce_price_thousand_sep'       => ' ',
			'woocommerce_price_decimal_sep'        => ',',
			'woocommerce_price_num_decimals'       => '0',
			'woocommerce_default_country'          => 'CZ',
			'woocommerce_allowed_countries'        => 'specific',
			'woocommerce_specific_allowed_countries' => array( 'CZ', 'SK' ),
			'woocommerce_ship_to_countries'        => 'specific',
			'woocommerce_specific_ship_to_countries' => array( 'CZ', 'SK' ),
			'woocommerce_weight_unit'              => 'kg',
			'woocommerce_dimension_unit'           => 'cm',
			'woocommerce_enable_guest_checkout'    => 'yes',
			'woocommerce_enable_checkout_login_reminder' => 'no',
			'woocommerce_enable_coupons'           => 'yes',
			'woocommerce_prices_include_tax'       => 'yes',
			'woocommerce_calc_taxes'               => 'no',
			'woocommerce_checkout_phone_field'     => 'required',
			'woocommerce_checkout_company_field'   => 'optional',
			'woocommerce_checkout_address_2_field' => 'optional',
			'woocommerce_ship_to_destination'      => 'billing',
			'timezone_string'                      => 'Europe/Prague',
		);
		foreach ( $defaults as $option => $value ) {
			if ( $force || false === get_option( $option, false ) || in_array( get_option( $option ), array( '', 'USD', 'GB', 'US:CA' ), true ) ) {
				update_option( $option, $value );
				$log[] = "option {$option} set";
			}
		}

		// --- Payment gateways: enable COD + bank transfer when nothing is enabled -----
		$cod  = get_option( 'woocommerce_cod_settings', array() );
		$bacs = get_option( 'woocommerce_bacs_settings', array() );
		$any_enabled = false;
		if ( function_exists( 'WC' ) && WC()->payment_gateways() ) {
			foreach ( WC()->payment_gateways()->payment_gateways() as $gw ) {
				if ( 'yes' === $gw->enabled ) {
					$any_enabled = true;
					break;
				}
			}
		}
		if ( $force || ! $any_enabled ) {
			update_option(
				'woocommerce_cod_settings',
				array_merge(
					(array) $cod,
					array(
						'enabled'      => 'yes',
						'title'        => 'Dobírka',
						'description'  => 'Zaplatíte hotově nebo kartou při převzetí zásilky.',
						'instructions' => 'Zaplatíte při převzetí zásilky.',
					)
				)
			);
			update_option(
				'woocommerce_bacs_settings',
				array_merge(
					(array) $bacs,
					array(
						'enabled'      => 'yes',
						'title'        => 'Bankovní převod',
						'description'  => 'Platba předem na účet. Zboží odesíláme po připsání platby.',
						'instructions' => 'Platbu prosím odešlete na náš účet, jako variabilní symbol uveďte číslo objednávky.',
					)
				)
			);
			$log[] = 'gateways cod + bacs enabled';
		}

		// --- Shipping zone ------------------------------------------------------------
		if ( class_exists( 'WC_Shipping_Zones' ) && ( $force || empty( WC_Shipping_Zones::get_zones() ) ) ) {
			$exists = false;
			foreach ( WC_Shipping_Zones::get_zones() as $z ) {
				if ( 'Česká republika' === $z['zone_name'] ) {
					$exists = true;
				}
			}
			if ( ! $exists ) {
				$zone = new WC_Shipping_Zone();
				$zone->set_zone_name( 'Česká republika' );
				$zone->set_locations( array( array( 'code' => 'CZ', 'type' => 'country' ) ) );
				$zone->save();

				$methods = array();
				if ( class_exists( 'Bohemia_Shipping_Zasilkovna' ) ) {
					$methods[] = array( 'bohemia_zasilkovna', array( 'title' => 'Zásilkovna – výdejní místo', 'cost' => '89', 'free_over' => '2500' ) );
				}
				$methods[] = array( 'flat_rate', array( 'title' => 'PPL – doručení na adresu', 'cost' => '119', 'tax_status' => 'none' ) );
				$methods[] = array( 'local_pickup', array( 'title' => 'Osobní odběr na prodejně', 'cost' => '0', 'tax_status' => 'none' ) );

				foreach ( $methods as $m ) {
					list( $id, $settings ) = $m;
					$instance_id = $zone->add_shipping_method( $id );
					if ( $instance_id ) {
						$option = 'woocommerce_' . $id . '_' . $instance_id . '_settings';
						update_option( $option, array_merge( (array) get_option( $option, array() ), $settings ) );
					}
				}
				$log[] = 'shipping zone "Česká republika" created';
			}
		}

		// --- Static pages ---------------------------------------------------------------
		foreach ( self::pages() as $slug => $def ) {
			$existing = get_page_by_path( $slug, OBJECT, 'page' );
			if ( $existing ) {
				continue;
			}
			$id = wp_insert_post(
				array(
					'post_type'    => 'page',
					'post_status'  => 'publish',
					'post_name'    => $slug,
					'post_title'   => $def[0],
					'post_content' => $def[1],
				)
			);
			if ( $id && ! is_wp_error( $id ) ) {
				$log[] = "page {$slug} created";
				if ( self::page_slugs()['terms'] === $slug ) {
					update_option( 'woocommerce_terms_page_id', $id );
				}
			}
		}

		// Frontend URL default → site URL.
		$settings = (array) get_option( Bohemia_Settings::OPTION, array() );
		if ( empty( $settings['frontend_url'] ) ) {
			$settings['frontend_url'] = home_url();
			update_option( Bohemia_Settings::OPTION, $settings );
		}

		update_option( self::DONE_OPTION, BOHEMIA_VERSION );
		return $log;
	}
}
