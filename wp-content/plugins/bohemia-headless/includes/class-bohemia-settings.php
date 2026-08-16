<?php
/**
 * Plugin settings (WooCommerce ▸ Bohemia Shop) with env/constant overrides.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

class Bohemia_Settings {

	const OPTION = 'bohemia_settings';

	/** @var array|null */
	private static $cache = null;

	public static function init() {
		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ), 60 );
		add_action( 'admin_init', array( __CLASS__, 'register' ) );
	}

	/**
	 * Field definitions: key => [label, type, description, default].
	 */
	public static function fields() {
		return array(
			'frontend_url'           => array( 'Adresa frontendu (URL)', 'url', 'Základní URL React aplikace, např. https://shop.bohemiadriver.cz. Používá se pro odkazy v e-mailech, návrat z platební brány atd. Prázdné = URL webu.', '' ),
			'contact_email'          => array( 'Kontaktní e-mail', 'email', 'Kam chodí zprávy z kontaktního formuláře a nové registrace do newsletteru. Prázdné = e-mail správce.', '' ),
			'contact_phone'          => array( 'Kontaktní telefon', 'text', 'Zobrazuje se na frontendu.', '' ),
			'contact_address'        => array( 'Adresa provozovny', 'textarea', 'Zobrazuje se na frontendu (patička, kontakt).', '' ),
			'cod_fee'                => array( 'Poplatek za dobírku (Kč)', 'number', 'Přičte se k objednávce při platbě na dobírku. 0 = bez poplatku.', '39' ),
			'packeta_widget_key'     => array( 'Zásilkovna – klíč widgetu (API key)', 'text', 'Veřejný klíč pro widget výběru výdejního místa (Klientská sekce ▸ Podpora ▸ Klíč pro widget).', '' ),
			'packeta_api_password'   => array( 'Zásilkovna – API heslo', 'password', 'Tajné API heslo pro vytváření zásilek a tisk štítků (Klientská sekce ▸ Podpora ▸ API heslo).', '' ),
			'packeta_sender'         => array( 'Zásilkovna – označení odesílatele (eshop)', 'text', 'Označení odesílatele nastavené v klientské sekci Zásilkovny.', '' ),
			'packeta_auto_submit'    => array( 'Zásilkovna – odeslat automaticky po zaplacení', 'checkbox', 'Po přijetí platby (stav „Zpracovává se“) se zásilka automaticky založí v Zásilkovně.', '' ),
			'packeta_default_weight' => array( 'Zásilkovna – výchozí hmotnost balíku (kg)', 'number', 'Použije se, pokud produkty nemají vyplněnou hmotnost.', '1' ),
		);
	}

	/**
	 * Get a setting. Constants (BOHEMIA_<KEY>) and env vars take precedence over saved options.
	 */
	public static function get( $key, $default = null ) {
		$const = 'BOHEMIA_' . strtoupper( $key );
		if ( defined( $const ) && constant( $const ) !== '' ) {
			return constant( $const );
		}
		$env = getenv( $const );
		if ( false !== $env && '' !== $env ) {
			return $env;
		}
		if ( null === self::$cache ) {
			self::$cache = (array) get_option( self::OPTION, array() );
		}
		if ( isset( self::$cache[ $key ] ) && '' !== self::$cache[ $key ] ) {
			return self::$cache[ $key ];
		}
		if ( null !== $default ) {
			return $default;
		}
		$fields = self::fields();
		return isset( $fields[ $key ] ) ? $fields[ $key ][3] : '';
	}

	public static function frontend_url( $path = '' ) {
		$base = self::get( 'frontend_url' );
		if ( ! $base ) {
			$base = home_url();
		}
		return untrailingslashit( $base ) . '/' . ltrim( $path, '/' );
	}

	public static function contact_email() {
		$email = self::get( 'contact_email' );
		return $email ? $email : get_option( 'admin_email' );
	}

	public static function admin_menu() {
		$parent = class_exists( 'WooCommerce' ) ? 'woocommerce' : 'options-general.php';
		add_submenu_page( $parent, 'Bohemia Shop – nastavení', 'Bohemia Shop', 'manage_options', 'bohemia-settings', array( __CLASS__, 'render_page' ) );
	}

	public static function register() {
		register_setting( 'bohemia_settings_group', self::OPTION, array( 'sanitize_callback' => array( __CLASS__, 'sanitize' ) ) );
	}

	public static function sanitize( $input ) {
		$out   = array();
		$input = is_array( $input ) ? $input : array();
		foreach ( self::fields() as $key => $def ) {
			$val = isset( $input[ $key ] ) ? $input[ $key ] : '';
			switch ( $def[1] ) {
				case 'url':
					$out[ $key ] = esc_url_raw( trim( $val ) );
					break;
				case 'email':
					$out[ $key ] = sanitize_email( $val );
					break;
				case 'number':
					$out[ $key ] = '' === $val ? '' : (string) floatval( str_replace( ',', '.', $val ) );
					break;
				case 'checkbox':
					$out[ $key ] = empty( $val ) ? '' : 'yes';
					break;
				case 'textarea':
					$out[ $key ] = sanitize_textarea_field( $val );
					break;
				default:
					$out[ $key ] = sanitize_text_field( $val );
			}
		}
		self::$cache = null;
		return $out;
	}

	public static function render_page() {
		if ( ! current_user_can( 'manage_options' ) ) {
			return;
		}
		$values = (array) get_option( self::OPTION, array() );
		?>
		<div class="wrap">
			<h1>Bohemia Shop – nastavení headless e-shopu</h1>
			<p>
				Nastavení Stripe (klíče API, webhook) najdete v
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=wc-settings&tab=checkout&section=bohemia_stripe' ) ); ?>">WooCommerce ▸ Platby ▸ Stripe (Bohemia)</a>.
				Cenu dopravy Zásilkovnou nastavíte v
				<a href="<?php echo esc_url( admin_url( 'admin.php?page=wc-settings&tab=shipping' ) ); ?>">WooCommerce ▸ Doprava ▸ Zóny</a>.
			</p>
			<form method="post" action="options.php">
				<?php settings_fields( 'bohemia_settings_group' ); ?>
				<table class="form-table" role="presentation">
					<?php foreach ( self::fields() as $key => $def ) : ?>
						<?php
						list( $label, $type, $desc, $default ) = $def;
						$name      = self::OPTION . '[' . $key . ']';
						$value     = isset( $values[ $key ] ) ? $values[ $key ] : '';
						$const     = 'BOHEMIA_' . strtoupper( $key );
						$overrides = ( defined( $const ) && constant( $const ) !== '' ) || ( getenv( $const ) !== false && getenv( $const ) !== '' );
						?>
						<tr>
							<th scope="row"><label for="bohemia_<?php echo esc_attr( $key ); ?>"><?php echo esc_html( $label ); ?></label></th>
							<td>
								<?php if ( 'textarea' === $type ) : ?>
									<textarea class="large-text" rows="3" id="bohemia_<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $name ); ?>"><?php echo esc_textarea( $value ); ?></textarea>
								<?php elseif ( 'checkbox' === $type ) : ?>
									<label><input type="checkbox" id="bohemia_<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $name ); ?>" value="yes" <?php checked( 'yes', $value ); ?>> Ano</label>
								<?php else : ?>
									<input class="regular-text" type="<?php echo esc_attr( 'number' === $type ? 'text' : $type ); ?>" id="bohemia_<?php echo esc_attr( $key ); ?>" name="<?php echo esc_attr( $name ); ?>" value="<?php echo esc_attr( $value ); ?>" placeholder="<?php echo esc_attr( $default ); ?>" autocomplete="off">
								<?php endif; ?>
								<?php if ( $desc ) : ?>
									<p class="description"><?php echo esc_html( $desc ); ?></p>
								<?php endif; ?>
								<?php if ( $overrides ) : ?>
									<p class="description" style="color:#b32d2e">Hodnota je přepsána konstantou / proměnnou prostředí <code><?php echo esc_html( $const ); ?></code>.</p>
								<?php endif; ?>
							</td>
						</tr>
					<?php endforeach; ?>
				</table>
				<?php submit_button( 'Uložit nastavení' ); ?>
			</form>
			<hr>
			<h2>Webhook Stripe</h2>
			<p>
				URL pro webhook ve Stripe Dashboardu: <code><?php echo esc_html( rest_url( BOHEMIA_REST_NS . '/stripe-webhook' ) ); ?></code><br>
				Události: <code>checkout.session.completed</code>, <code>checkout.session.async_payment_succeeded</code>, <code>checkout.session.async_payment_failed</code>, <code>checkout.session.expired</code>.
			</p>
			<h2>Newsletter</h2>
			<p>
				<a href="<?php echo esc_url( admin_url( 'edit.php?post_type=bohemia_subscriber' ) ); ?>">Seznam odběratelů</a> ·
				<a href="<?php echo esc_url( wp_nonce_url( admin_url( 'admin-post.php?action=bohemia_export_subscribers' ), 'bohemia_export_subscribers' ) ); ?>">Export CSV</a>
			</p>
			<h2>Frontend</h2>
			<p>Veřejná konfigurace pro React aplikaci: <code><?php echo esc_html( rest_url( BOHEMIA_REST_NS . '/config' ) ); ?></code></p>
		</div>
		<?php
	}
}
