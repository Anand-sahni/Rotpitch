import { readFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { env } from '../env.js';
import { RenderError } from '../lib/errors.js';

/**
 * Hosted OpenAI transcription (Whisper). We POST the extracted audio to the
 * transcriptions endpoint and ask for `verbose_json` with segment timestamps,
 * which the caption builder turns into a styled .ass subtitle file. No SDK —
 * native fetch + FormData (Node 20+) keeps the dependency footprint lean.
 *
 * The same transcript is the script source for AI voiceover (Phase 6, Decisions
 * Log), so this stays caption-agnostic and just returns timed text.
 */

const TRANSCRIBE_URL = 'https://api.openai.com/v1/audio/transcriptions';

/** A timed chunk of transcribed speech. */
export interface TranscriptSegment {
  start: number; // seconds
  end: number; // seconds
  text: string;
}

interface VerboseJson {
  text?: string;
  segments?: Array<{ start: number; end: number; text: string }>;
}

/**
 * Transcribe an audio file into timed segments. Returns `[]` when the model
 * hears no speech (e.g. a silent demo) — the caller then renders without
 * captions rather than failing. Throws a user-facing RenderError on misconfig
 * or API failure so the worker can refund the credit.
 */
export async function transcribeAudio(audioPath: string): Promise<TranscriptSegment[]> {
  if (!env.OPENAI_API_KEY) {
    throw new RenderError('Captions are temporarily unavailable. Your credit was refunded — please try again later.');
  }

  const bytes = await readFile(audioPath);
  const form = new FormData();
  form.append('file', new Blob([bytes]), basename(audioPath));
  form.append('model', env.OPENAI_TRANSCRIBE_MODEL);
  form.append('response_format', 'verbose_json');
  form.append('timestamp_granularities[]', 'segment');

  let res: Response;
  try {
    res = await fetch(TRANSCRIBE_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: form,
    });
  } catch (err) {
    throw new RenderError(
      `Could not reach the captioning service. Your credit was refunded — please try again. (${(err as Error).message})`,
    );
  }

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    // eslint-disable-next-line no-console
    console.error(`[whisper] transcription failed ${res.status}: ${detail.slice(-400)}`);
    throw new RenderError('Caption generation failed. Your credit was refunded — please try again.');
  }

  const data = (await res.json()) as VerboseJson;
  const segments = (data.segments ?? [])
    .map((s) => ({ start: s.start, end: s.end, text: s.text.trim() }))
    .filter((s) => s.text.length > 0 && Number.isFinite(s.start) && Number.isFinite(s.end) && s.end > s.start);
  return segments;
}
