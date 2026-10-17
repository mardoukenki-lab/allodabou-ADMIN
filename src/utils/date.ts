/**
 * Convertit en toute sécurité un Timestamp Firestore ou objet {seconds, nanoseconds} en Date JavaScript
 */
export function toJsDate(val: any): Date {
  if (!val) return new Date(0);
  if (typeof val?.toDate === 'function') {
    return val.toDate();
  }
  if (typeof val?.seconds === 'number') {
    return new Date(val.seconds * 1000);
  }
  if (val instanceof Date) {
    return val;
  }
  const parsed = new Date(val);
  return isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

/**
 * Formate une date au format jj/mm/aaaa hh:mm avec le fuseau horaire de Côte d'Ivoire (Africa/Abidjan)
 */
export function formatFrenchDate(val: any, includeTime = true): string {
  if (!val) return 'Non renseigné';
  const d = toJsDate(val);
  if (d.getTime() === 0) return 'Non renseigné';

  // Formatage jj/mm/aaaa hh:mm sur le fuseau Africa/Abidjan
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Africa/Abidjan',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(includeTime
      ? {
          hour: '2-digit',
          minute: '2-digit',
        }
      : {}),
  };

  return d.toLocaleDateString('fr-FR', options);
}

/**
 * Formate un montant en Francs CFA (XOF)
 */
export function formatFCFA(amount: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}
