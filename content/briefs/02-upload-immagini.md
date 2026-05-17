---
title: Upload Immagini e Documenti
description: Sistema di upload con compressione client-side, Supabase Storage e considerazioni mobile.
date: 2026-05-17
status: ready
---

# Upload Immagini e Documenti

## Stack scelto

- **Storage**: Supabase Storage (già integrato, RLS nativa, collegato alla tabella `photos`)
- **Compressione**: client-side con `browser-image-compression` prima dell'upload
- **Visualizzazione**: `next/image` per ottimizzazione automatica per device

## Installazione

```bash
npm install browser-image-compression
```

## Config compressione

```ts
import imageCompression from 'browser-image-compression';

const compressed = await imageCompression(file, {
  maxSizeMB: 1.5,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  preserveExifData: true,   // fix orientamento foto mobile — obbligatorio
  initialQuality: 0.85,
});
```

## Considerazioni mobile

### HEIC / iPhone
Safari converte automaticamente le foto HEIC in JPEG quando l'utente le seleziona dal picker. Nessun intervento necessario.

### EXIF rotation
Le foto scattate da mobile hanno l'orientamento nell'EXIF, non nel pixel data. Senza `preserveExifData: true` le immagini arrivano ruotate dopo la compressione.

### Memoria iOS
Con `maxWidthOrHeight: 1920` si è sempre sotto il limite Canvas di Safari (anche su device pre-2019). Non alzare oltre.

### Android entry-level
Dispositivi con fotocamere da 50MP+ (Xiaomi, Realme ecc.) possono impiegare 4-6 secondi per la compressione. **Mostrare sempre un loader** durante l'operazione, altrimenti l'utente pensa che sia crashato.

### Background iOS
Se l'utente switcha app durante l'upload, Safari sospende il tab e il request si perde. Non è evitabile: gestire il fallimento con un messaggio di errore chiaro e un bottone "Riprova".

## Documenti (PDF ecc.)

Nessuna compressione — upload diretto su Supabase Storage as-is. Il ridimensionamento non ha senso per i documenti.

## Visualizzazione

Usare sempre `next/image` per le immagini caricate: ottimizza automaticamente formato (WebP), dimensioni e qualità in base al device, senza configurazione extra.

```tsx
import Image from 'next/image';

<Image
  src={supabasePublicUrl}
  alt={caption}
  width={800}
  height={600}
  className="rounded-lg object-cover"
/>
```
