/**
 * Contrato del proveedor de correo (SMTP pendiente de elegir).
 * Un fallo de envío nunca debe invalidar una compra: los correos se envían desde el worker
 * con reintentos. Ver docs/checkout-inventory-payments.md.
 */
export interface EmailProvider {
  readonly name: string;
  send(message: EmailMessage): Promise<{ readonly providerMessageId: string | null }>;
}

export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html?: string;
  readonly replyTo?: string;
}
