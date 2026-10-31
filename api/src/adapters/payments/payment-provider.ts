import type { Money } from "@javis-market/shared";

/**
 * Contrato que debe cumplir cualquier pasarela de pago (Stripe es la propuesta, sin confirmar).
 * Los módulos de negocio dependen de esta interfaz, nunca del SDK de un proveedor concreto.
 * Ver docs/integrations.md y docs/checkout-inventory-payments.md.
 */
export interface PaymentProvider {
  readonly name: string;

  /** Crea un intento de pago en el proveedor. `idempotencyKey` evita cobros duplicados en reintentos. */
  createPaymentIntent(input: {
    readonly amount: Money;
    readonly orderReference: string;
    readonly idempotencyKey: string;
  }): Promise<{ readonly providerPaymentId: string; readonly clientSecret?: string }>;

  /** Verifica la firma de un webhook y devuelve el evento normalizado; lanza un error si no es válido. */
  verifyWebhook(input: { readonly rawBody: string; readonly signature: string | null }): Promise<PaymentProviderEvent>;

  /** Solicita un reembolso total o parcial. */
  refund(input: {
    readonly providerPaymentId: string;
    readonly amount: Money;
    readonly idempotencyKey: string;
  }): Promise<{ readonly providerRefundId: string }>;
}

export interface PaymentProviderEvent {
  readonly providerEventId: string;
  readonly type:
    "payment_succeeded" | "payment_failed" | "payment_canceled" | "refund_succeeded" | "refund_failed" | "other";
  readonly providerPaymentId: string | null;
  readonly amount: Money | null;
  readonly occurredAt: Date;
}
