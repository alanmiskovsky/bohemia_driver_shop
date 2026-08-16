<?php
/**
 * Plugin Name: Bohemia Driver Shop – Headless
 * Plugin URI:  https://shop.bohemiadriver.cz
 * Description: Backend pro headless React e-shop: nastavení, přesměrování URL na frontend, veřejná konfigurace, newsletter, SMTP z prostředí a načítání feature modulů (Store API rozšíření, Zásilkovna, Stripe…).
 * Version:     1.0.0
 * Author:      Bohemia Driver
 * Text Domain: bohemia-headless
 * Requires at least: 6.4
 * Requires PHP: 8.0
 * WC requires at least: 8.0
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'BOHEMIA_VERSION', '1.0.0' );
define( 'BOHEMIA_PLUGIN_FILE', __FILE__ );
define( 'BOHEMIA_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'BOHEMIA_REST_NS', 'bohemia/v1' );

// Core (WooCommerce independent) classes.
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-settings.php';
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-mail.php';
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-urls.php';
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-newsletter.php';
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-rest.php';
require_once BOHEMIA_PLUGIN_DIR . 'includes/class-bohemia-setup.php';

// HPOS (custom order tables) + block checkout compatibility declaration.
add_action(
	'before_woocommerce_init',
	function () {
		if ( class_exists( \Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
			\Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'cart_checkout_blocks', __FILE__, true );
		}
	}
);

Bohemia_Settings::init();
Bohemia_Mail::init();
Bohemia_Newsletter::init();

/**
 * Feature modules live in includes/features/*.php. Each file is loaded after WooCommerce
 * and should hook into the `bohemia_wc_init` action to register itself:
 *
 *   add_action( 'bohemia_wc_init', array( 'My_Feature', 'init' ) );
 *
 * REST routes are added by hooking `bohemia_register_rest_routes` (see Bohemia_Rest).
 */
add_action(
	'plugins_loaded',
	function () {
		if ( ! class_exists( 'WooCommerce' ) ) {
			add_action(
				'admin_notices',
				function () {
					echo '<div class="notice notice-error"><p><strong>Bohemia Driver Shop – Headless</strong> vyžaduje aktivní plugin WooCommerce.</p></div>';
				}
			);
			return;
		}

		foreach ( glob( BOHEMIA_PLUGIN_DIR . 'includes/features/*.php' ) as $feature ) {
			require_once $feature;
		}

		Bohemia_Urls::init();

		/**
		 * Fires once WooCommerce is available and all feature modules are loaded.
		 */
		do_action( 'bohemia_wc_init' );

		Bohemia_Setup::init();
	},
	20
);

add_action( 'rest_api_init', array( 'Bohemia_Rest', 'register_routes' ) );

register_activation_hook(
	__FILE__,
	function () {
		update_option( 'bohemia_run_setup', 1 );
	}
);
