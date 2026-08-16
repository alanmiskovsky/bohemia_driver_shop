<?php
/**
 * Shipping method "Zásilkovna – výdejní místo" (id `bohemia_zasilkovna`).
 *
 * Zone based (instance settings): fixed cost, optional free shipping threshold, tax status.
 * The pickup point itself is chosen on the frontend (Packeta widget) and stored on the order
 * by the checkout extension (`_bohemia_packeta_point`); packet submission lives in packeta.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Define the shipping method class. WC_Shipping_Method is available once WooCommerce is loaded;
 * we still guard it so the file can be included in any order.
 */
function bohemia_define_shipping_zasilkovna() {
	if ( class_exists( 'Bohemia_Shipping_Zasilkovna', false ) || ! class_exists( 'WC_Shipping_Method' ) ) {
		return;
	}

	class Bohemia_Shipping_Zasilkovna extends WC_Shipping_Method {

		const METHOD_ID = 'bohemia_zasilkovna';

		public function __construct( $instance_id = 0 ) {
			$this->id                 = self::METHOD_ID;
			$this->instance_id        = absint( $instance_id );
			$this->method_title       = 'Zásilkovna – výdejní místo';
			$this->method_description = 'Doručení na výdejní místo Zásilkovny nebo do Z-BOXu. Zákazník vybírá místo ve widgetu Zásilkovny na frontendu; zásilky lze odesílat do Zásilkovny přímo z detailu objednávky.';
			$this->supports           = array(
				'shipping-zones',
				'instance-settings',
				'instance-settings-modal',
			);

			$this->init();
		}

		public function init() {
			$this->init_form_fields();
			$this->init_settings();

			$this->title      = $this->get_option( 'title', 'Zásilkovna – výdejní místo' );
			$this->tax_status = $this->get_option( 'tax_status', 'none' );

			add_action( 'woocommerce_update_options_shipping_' . $this->id, array( $this, 'process_admin_options' ) );
		}

		public function init_form_fields() {
			$this->instance_form_fields = array(
				'title'      => array(
					'title'       => 'Název',
					'type'        => 'text',
					'description' => 'Název dopravy zobrazený zákazníkovi.',
					'default'     => 'Zásilkovna – výdejní místo',
					'desc_tip'    => true,
				),
				'cost'       => array(
					'title'       => 'Cena (Kč)',
					'type'        => 'text',
					'description' => 'Cena dopravy na výdejní místo.',
					'default'     => '89',
					'desc_tip'    => true,
					'placeholder' => '89',
				),
				'free_over'  => array(
					'title'       => 'Zdarma od (Kč)',
					'type'        => 'text',
					'description' => 'Hodnota košíku (po slevách), od které je doprava zdarma. 0 = nikdy.',
					'default'     => '0',
					'desc_tip'    => true,
					'placeholder' => '0',
				),
				'tax_status' => array(
					'title'   => 'Daňový status',
					'type'    => 'select',
					'class'   => 'wc-enhanced-select',
					'default' => 'none',
					'options' => array(
						'taxable' => 'Zdanitelné',
						'none'    => 'Bez daně',
					),
				),
			);
		}

		/**
		 * Cart subtotal used for the free shipping threshold: displayed subtotal minus discounts
		 * (same logic as WooCommerce's own free shipping method).
		 *
		 * @param array $package
		 * @return float
		 */
		protected function get_cart_subtotal_after_discounts( $package ) {
			if ( function_exists( 'WC' ) && WC()->cart ) {
				$total = (float) WC()->cart->get_displayed_subtotal();
				if ( WC()->cart->display_prices_including_tax() ) {
					$total = $total - (float) WC()->cart->get_discount_total() - (float) WC()->cart->get_discount_tax();
				} else {
					$total = $total - (float) WC()->cart->get_discount_total();
				}
				return round( max( 0, $total ), wc_get_price_decimals() );
			}
			return isset( $package['contents_cost'] ) ? (float) $package['contents_cost'] : 0.0;
		}

		/**
		 * @param array $package
		 */
		public function calculate_shipping( $package = array() ) {
			$cost      = (float) str_replace( ',', '.', (string) $this->get_option( 'cost', '89' ) );
			$free_over = (float) str_replace( ',', '.', (string) $this->get_option( 'free_over', '0' ) );

			if ( $free_over > 0 && $this->get_cart_subtotal_after_discounts( $package ) >= $free_over ) {
				$cost = 0;
			}

			$this->add_rate(
				array(
					'id'      => $this->get_rate_id(),
					'label'   => $this->title,
					'cost'    => max( 0, $cost ),
					'package' => $package,
				)
			);
		}
	}
}

/**
 * Registration with WooCommerce.
 */
class Bohemia_Shipping_Zasilkovna_Loader {

	public static function init() {
		bohemia_define_shipping_zasilkovna();
		add_action( 'woocommerce_shipping_init', 'bohemia_define_shipping_zasilkovna' );
		add_filter( 'woocommerce_shipping_methods', array( __CLASS__, 'register' ) );
	}

	public static function register( $methods ) {
		bohemia_define_shipping_zasilkovna();
		if ( class_exists( 'Bohemia_Shipping_Zasilkovna', false ) ) {
			$methods['bohemia_zasilkovna'] = 'Bohemia_Shipping_Zasilkovna';
		}
		return $methods;
	}
}
add_action( 'bohemia_wc_init', array( 'Bohemia_Shipping_Zasilkovna_Loader', 'init' ) );
