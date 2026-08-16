# Bohemia Driver Shop – Headless (WordPress plugin)

Backend glue for the React frontend in `/frontend`. Requires WooCommerce.

## Structure

- `bohemia-headless.php` – bootstrap; loads core classes and every `includes/features/*.php` module after WooCommerce.
- `includes/class-bohemia-settings.php` – **WooCommerce ▸ Bohemia Shop** settings page. Any setting can be overridden by a constant or env var `BOHEMIA_<KEY>` (e.g. `BOHEMIA_FRONTEND_URL`).
- `includes/class-bohemia-urls.php` – rewrites WooCommerce/WordPress URLs (e-mails, order received, pay, product permalinks…) to frontend routes.
- `includes/class-bohemia-rest.php` – `bohemia/v1` REST namespace: `GET /config`, `POST /newsletter`, `POST /newsletter/unsubscribe`; helpers `Bohemia_Rest::error()`, `Bohemia_Rest::rate_limit()`; action `bohemia_register_rest_routes` for modules; filter `bohemia_public_config`.
- `includes/class-bohemia-newsletter.php` – subscribers CPT, CSV export.
- `includes/class-bohemia-mail.php` – SMTP from env (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE`, `SMTP_FROM`, `SMTP_FROM_NAME`).
- `includes/class-bohemia-setup.php` – one-time defaults (CZK, COD + bank transfer, CZ shipping zone, legal pages). Re-run with `wp bohemia setup [--force]`.

## Writing a feature module

```php
<?php // includes/features/my-feature.php
class Bohemia_My_Feature {
    public static function init() { /* add hooks */ }
}
add_action( 'bohemia_wc_init', array( 'Bohemia_My_Feature', 'init' ) );
add_action( 'bohemia_register_rest_routes', function () { register_rest_route( BOHEMIA_REST_NS, '/my-route', [...] ); } );
```

## Zásilkovna (Packeta)

- `includes/features/shipping-zasilkovna.php` – shipping method `bohemia_zasilkovna` ("Zásilkovna – výdejní místo"), zone based. Instance settings: title, cost (default 89 Kč), free_over (cart subtotal after discounts from which shipping is free, 0 = never), tax_status. Frontend detects it by `rate.method_id === 'bohemia_zasilkovna'` and asks the customer to pick a pickup point in the Packeta widget.
- `includes/features/packeta.php` – `Bohemia_Packeta`: Packeta REST API client (`createPacket`, `packetLabelPdf`, `packetStatus`), order meta box **Zásilkovna** (pickup point, packet id / barcode / tracking link, buttons "Odeslat do Zásilkovny" and "Stáhnout štítek (PDF)"), order action + bulk action "Odeslat do Zásilkovny", automatic submission after payment (setting *Zásilkovna – odeslat automaticky po zaplacení*, on `processing`/`completed`), tracking + pickup point info in customer e-mails.
- Settings (WooCommerce ▸ Bohemia Shop or env `BOHEMIA_PACKETA_*`): `packeta_widget_key` (public widget key for the frontend), `packeta_api_password` (secret, packet creation), `packeta_sender` (eshop label from the client section), `packeta_auto_submit`, `packeta_default_weight` (kg, used when products have no weight).
- Order meta: `_bohemia_packeta_point` (pickup point array, written by the checkout extension), `_bohemia_packeta_id`, `_bohemia_packeta_barcode`, `_bohemia_tracking_url` (`https://tracking.packeta.com/cs/?id=<barcode>`), `_bohemia_packeta_last_error`.
- COD orders (`payment_method === 'cod'`) are submitted with `cod` = order total (whole CZK); the value of the packet is the order total. Weight = sum of product weights converted to kg, else the default weight.
- Filters/actions: `bohemia_packeta_packet_attributes( $attributes, $order, $point )`, `bohemia_packeta_packet_created( $order, $id, $barcode )`. Logs: WooCommerce ▸ Status ▸ Logs, source `bohemia-packeta`.

## Stripe (platba kartou)

`includes/features/gateway-stripe.php` – gateway `bohemia_stripe` ("Stripe (Bohemia) – platba kartou") using **Stripe Checkout** (hosted page, no SDK). Settings live in **WooCommerce ▸ Platby ▸ Stripe (Bohemia)**.

Setup:
1. Stripe Dashboard ▸ Developers ▸ API keys: copy the *Publishable key* and *Secret key* (test and/or live) into the gateway settings; tick *Testovací režim* while testing (test card `4242 4242 4242 4242`).
2. Stripe Dashboard ▸ Developers ▸ Webhooks ▸ Add endpoint: URL `https://<your-domain>/wp-json/bohemia/v1/stripe-webhook`, events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Copy the *Signing secret* (`whsec_…`) into *Webhook signing secret*. Requests without a valid `Stripe-Signature` (or with no secret configured) are rejected with 400.
3. Enable the gateway. `GET /wp-json/bohemia/v1/config` then contains `payment_methods[]` with `bohemia_stripe` and `stripe: { publishable_key, testmode }`.

Flow:
- Checkout (`POST /wc/store/v1/checkout` with `payment_method: "bohemia_stripe"`) → `process_payment()` creates a Checkout Session (`mode=payment`, one line item = order total, `metadata.order_id/order_key`, `success_url` = frontend `/order-confirmation?order=&key=&session_id={CHECKOUT_SESSION_ID}`, `cancel_url` = frontend `/checkout?cancelled=1&order={id}`, `locale=cs`) and returns `payment_result.redirect_url` – the frontend does `window.location.assign(redirect_url)`. Failures throw with a Czech message (Store API responds 402 `woocommerce_rest_checkout_process_payment_error`). The cart is **not** emptied server-side before the redirect (the customer may cancel and come back); the frontend clears it on the confirmation page.
- Webhook marks the order paid (`payment_complete(payment_intent)`); `checkout.session.expired` cancels an order that is still pending; async failure sets `failed`.
- Verify-on-return: `GET /wp-json/bohemia/v1/order/{id}/payment-status?key={order_key}` → `{ paid, status, needs_payment }` (queries Stripe when the order still awaits payment and marks it paid if the session is `paid`).
- Re-pay: `POST /wp-json/bohemia/v1/order/{id}/pay` body `{ "key": order_key }` → `{ paid: true, redirect_url: null }` when already paid, `{ paid: false, redirect_url }` with a fresh Checkout Session otherwise (409 if the order can no longer be paid / gateway unavailable). Previous open sessions are expired so an order cannot be paid twice.
- Order meta: `_bohemia_stripe_session_id`, `_bohemia_stripe_mode` (`test`|`live`), `_bohemia_stripe_attempt`, `_bohemia_stripe_payment_intent`. Filter `bohemia_stripe_session_params( $params, $order )`. Logs: source `bohemia-stripe`.
