/**
 * Audio service for processing, analyzing, and manipulating audio files
 * Provides functionality for metadata extraction, loudness analysis, silence detection,
 * and audio format conversions using FFmpeg
 * @module audio.service
 */

// cSpell:ignore ffprobe Ffprobe astats aresample lavfi silencedetect Vorbis libvorbis

import ffmpeg from 'fluent-ffmpeg';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

const execPromise = util.promisify(exec);

/**
 * Audio metadata information extracted from audio files
 * @interface AudioMetadata
 */
interface AudioMetadata {
  /** Duration of the audio file in seconds */
  duration: number;
  /** Sample rate in Hz */
  sampleRate: number;
  /** Number of audio channels */
  channels: number;
  /** Bit rate in bits per second */
  bitRate: number;
  /** Audio codec name */
  codec: string;
  /** Audio format name */
  format: string;
}

/**
 * Loudness data point with time and loudness level
 * @interface AudioLoudnessData
 */
interface AudioLoudnessData {
  /** Time position in seconds */
  time: number;
  /** Loudness level in dB */
  loudness: number;
}

/**
 * Silent interval in audio with start, end, and duration
 * @interface SilenceInterval
 */
interface SilenceInterval {
  /** Start time of silence in seconds */
  start: number;
  /** End time of silence in seconds */
  end: number;
  /** Duration of silence in seconds */
  duration: number;
}

/**
 * Audio chunk definition with start and end times
 * @interface AudioChunk
 */
interface AudioChunk {
  /** Start time of chunk in seconds */
  start: number;
  /** End time of chunk in seconds */
  end: number;
}

/**
 * Non-silent interval in audio with start, end, and duration
 * @interface NonSilentInterval
 */
interface NonSilentInterval {
  /** Start time of non-silent audio in seconds */
  start: number;
  /** End time of non-silent audio in seconds */
  end: number;
  /** Duration of non-silent audio in seconds */
  duration: number;
}

/**
 * Probes an audio file to extract metadata using FFmpeg
 * @param file_path - Path to the audio file
 * @returns Promise that resolves to FFmpeg probe data
 * @private
 */
const probeFile = (file_path: string): Promise<ffmpeg.FfprobeData> => 
  new Promise((resolve, reject) => {
    ffmpeg.ffprobe(file_path, (err: any, metadata: ffmpeg.FfprobeData) => {
      if (err) reject(err);
      else resolve(metadata);
    });
  });

/**
 * Extracts audio metadata from FFmpeg probe data
 * @param data - FFmpeg probe data
 * @returns Structured audio metadata
 * @private
 */
const extractMetadata = (data: ffmpeg.FfprobeData): AudioMetadata => {
  const stream = data.streams.find((s: any) => s.codec_type === 'audio');
  if (!stream) throw new Error('No audio stream found');

  const format = data.format;
  return {
    duration: Number(format.duration) || 0,
    sampleRate: Number(stream.sample_rate) || 0,
    channels: stream.channels || 0,
    bitRate: Number(stream.bit_rate) || 0,
    codec: stream.codec_name || 'unknown',
    format: format.format_name || 'unknown'
  };
};

/**
 * Extracts metadata from an audio file
 * @param file_path - Path to the audio file
 * @returns Promise that resolves to audio metadata
 * @throws Error if file cannot be processed or no audio stream found
 * @example
 * ```typescript
 * const metadata = await getMetadata('./audio.mp3');
 * console.log(`Duration: ${metadata.duration}s, Codec: ${metadata.codec}`);
 * ```
 */
export const getMetadata = async (file_path: string): Promise<AudioMetadata> => {
  try {
    const data = await probeFile(file_path);
    return extractMetadata(data);
  } catch (error) {
    console.error('Error getting audio metadata:', error);
    throw error;
  }
};

/**
 * Analyzes audio loudness over time with specified interval
 * @param file_path - Path to the audio file
 * @param interval - Time interval for analysis in seconds (default: 0.1)
 * @returns Promise that resolves to array of loudness data points
 * @throws Error if analysis fails
 * @example
 * ```typescript
 * const loudnessData = await analyzeLoudness('./audio.mp3', 0.5);
 * loudnessData.forEach(point => {
 *   console.log(`Time: ${point.time}s, Loudness: ${point.loudness}dB`);
 * });
 * ```
 */
export const analyzeLoudness = (file_path: string, interval = 0.1): Promise<AudioLoudnessData[]> => {
  const loudness_data: AudioLoudnessData[] = [];

  return new Promise((resolve, reject) => {
    ffmpeg(file_path)
      .audioFilters(`astats=metadata=1:reset=${interval}`)
      .audioFilters('aresample=8000')
      .format('null')
      .output('/dev/null')
      .on('error', reject)
      .on('stderr', (stderr_line: string) => {
        const rms_match = stderr_line.match(/lavfi\.astats\.Overall\.RMS_level=(-?\d+(\.\d+)?)/);
        const time_match = stderr_line.match(/pts_time:(\d+(\.\d+)?)/);
        if (rms_match && time_match) {
          loudness_data.push({
            time: parseFloat(time_match[1]),
            loudness: parseFloat(rms_match[1])
          });
        }
      })
      .on('end', () => resolve(loudness_data))
      .run();
  });
};

/**
 * Detects silent intervals in audio based on threshold and minimum duration
 * @param file_path - Path to the audio file
 * @param threshold - Silence threshold in dB (default: -50)
 * @param min_duration - Minimum duration of silence to detect in seconds (default: 2)
 * @returns Promise that resolves to array of silence intervals
 * @throws Error if detection fails
 * @example
 * ```typescript
 * const silentParts = await detectSilence('./audio.mp3', -40, 1);
 * silentParts.forEach(interval => {
 *   console.log(`Silent from ${interval.start}s to ${interval.end}s`);
 * });
 * ```
 */
export const detectSilence = (file_path: string, threshold = -50, min_duration = 2): Promise<SilenceInterval[]> => {
  const silence_intervals: SilenceInterval[] = [];
  let current_interval: Partial<SilenceInterval> = {};

  return new Promise((resolve, reject) => {
    ffmpeg(file_path)
      .audioFilters(`silencedetect=noise=${threshold}dB:d=${min_duration}`)
      .format('null')
      .output('/dev/null')
      .on('error', reject)
      .on('stderr', (stderr_line: string) => {
        const silence_start_match = stderr_line.match(/silence_start: ([\d\.]+)/);
        const silence_end_match = stderr_line.match(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/);

        if (silence_start_match) {
          current_interval.start = parseFloat(silence_start_match[1]);
        } else if (silence_end_match) {
          current_interval.end = parseFloat(silence_end_match[1]);
          current_interval.duration = parseFloat(silence_end_match[2]);
          silence_intervals.push(current_interval as SilenceInterval);
          current_interval = {};
        }
      })
      .on('end', () => resolve(silence_intervals))
      .run();
  });
};

/**
 * Detects non-silent intervals in audio by analyzing silence gaps
 * @param file_path - Path to the audio file
 * @param threshold - Silence threshold in dB (default: -50)
 * @param min_duration - Minimum duration of silence to detect in seconds (default: 2)
 * @returns Promise that resolves to array of non-silent intervals
 * @throws Error if detection fails or audio duration cannot be determined
 * @example
 * ```typescript
 * const speechParts = await detectNonSilence('./audio.mp3', -40, 1);
 * speechParts.forEach(interval => {
 *   console.log(`Speech from ${interval.start}s to ${interval.end}s`);
 * });
 * ```
 */
export const detectNonSilence = async (
  file_path: string, 
  threshold = -50, 
  min_duration = 2
): Promise<NonSilentInterval[]> => {
  const silence_intervals: SilenceInterval[] = [];
  const non_silent_intervals: NonSilentInterval[] = [];
  let total_duration: number | null = null;

  return new Promise((resolve, reject) => {
    ffmpeg(file_path)
      .audioFilters(`silencedetect=noise=${threshold}dB:d=${min_duration}`)
      .format('null')
      .output('/dev/null')
      .on('error', reject)
      .on('stderr', (stderr_line: string) => {
        const silence_start_match = stderr_line.match(/silence_start: ([\d\.]+)/);
        const silence_end_match = stderr_line.match(/silence_end: ([\d\.]+) \| silence_duration: ([\d\.]+)/);
        const duration_match = stderr_line.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);

        if (silence_start_match) {
          silence_intervals.push({ 
            start: parseFloat(silence_start_match[1]), 
            end: 0, 
            duration: 0 
          });
        } else if (silence_end_match) {
          const last_interval = silence_intervals[silence_intervals.length - 1];
          last_interval.end = parseFloat(silence_end_match[1]);
          last_interval.duration = parseFloat(silence_end_match[2]);
        } else if (duration_match) {
          const [_, hours, minutes, seconds] = duration_match;
          total_duration = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseFloat(seconds);
        }
      })
      .on('end', () => {
        if (total_duration === null) {
          reject(new Error('Could not determine audio duration'));
          return;
        }

        let last_end = 0;
        for (const silence of silence_intervals) {
          if (silence.start > last_end) {
            non_silent_intervals.push({
              start: last_end,
              end: silence.start,
              duration: silence.start - last_end
            });
          }
          last_end = silence.end;
        }

        if (last_end < total_duration) {
          non_silent_intervals.push({
            start: last_end,
            end: total_duration,
            duration: total_duration - last_end
          });
        }

        resolve(non_silent_intervals);
      })
      .run();
  });
};

/**
 * Calculates an appropriate silence threshold based on the audio file's characteristics
 * @param file_path - Path to the audio file
 * @returns Promise that resolves to recommended silence threshold in dB
 * @throws Error if file cannot be analyzed or no audio stream found
 * @example
 * ```typescript
 * const threshold = await getAverageSilenceThreshold('./audio.mp3');
 * console.log(`Recommended threshold: ${threshold}dB`);
 * ```
 */
export const getAverageSilenceThreshold = async (file_path: string): Promise<number> => {
  try {
    const { stdout } = await execPromise(`ffprobe -v error -of json -show_format -show_streams "${file_path}"`);
    const data = JSON.parse(stdout);
    const audio_stream = data.streams.find((stream: any) => stream.codec_type === 'audio');
    
    if (!audio_stream) {
      throw new Error('No audio stream found');
    }

    const rms_level = parseFloat(audio_stream.rms_level) || -60;
    return rms_level + 10;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
};

/**
 * Calculates the average duration of silence intervals in an audio file
 * @param file_path - Path to the audio file
 * @returns Promise that resolves to average silence duration in seconds
 * @throws Error if analysis fails
 * @example
 * ```typescript
 * const avgDuration = await getAverageSilenceDuration('./audio.mp3');
 * console.log(`Average silence duration: ${avgDuration}s`);
 * ```
 */
export const getAverageSilenceDuration = async (file_path: string): Promise<number> => {
  const average_silence_threshold = await getAverageSilenceThreshold(file_path);
  const silence_segments = await detectSilence(file_path, average_silence_threshold + 25, 1);
  
  if (silence_segments.length === 0) {
    return 0;
  }

  const total_silence_duration = silence_segments.reduce(
    (sum, segment) => sum + (segment.end - segment.start), 
    0
  );
  
  return total_silence_duration / silence_segments.length;
};

/**
 * Extracts non-silent audio chunks based on detected silence intervals
 * @param silence_segments - Array of detected silence intervals
 * @param total_duration - Total duration of the audio file in seconds
 * @returns Array of audio chunks representing non-silent segments
 * @example
 * ```typescript
 * const silenceIntervals = await detectSilence('./audio.mp3');
 * const metadata = await getMetadata('./audio.mp3');
 * const chunks = extractNonSilentChunks(silenceIntervals, metadata.duration);
 * console.log(`Found ${chunks.length} non-silent chunks`);
 * ```
 */
export const extractNonSilentChunks = (
  silence_segments: SilenceInterval[], 
  total_duration: number
): AudioChunk[] => {
  const non_silent_chunks: AudioChunk[] = [];
  let last_end = 0;

  silence_segments.forEach((silence, index) => {
    if (silence.start > last_end) {
      non_silent_chunks.push({ start: last_end, end: silence.start });
    }
    last_end = silence.end;
    
    if (index === silence_segments.length - 1 && last_end < total_duration) {
      non_silent_chunks.push({ start: last_end, end: total_duration });
    }
  });

  return non_silent_chunks;
};

/**
 * Saves non-silent audio chunks as separate WAV files
 * @param file_path - Path to the source audio file
 * @param chunks - Array of audio chunks to save
 * @returns Promise that resolves to array of output file paths
 * @throws Error if file operations fail
 * @example
 * ```typescript
 * const chunks = [{start: 0, end: 10}, {start: 15, end: 25}];
 * const files = await saveNonSilentChunks('./audio.mp3', chunks);
 * console.log(`Saved chunks to: ${files.join(', ')}`);
 * ```
 */
export const saveNonSilentChunks = async (
  file_path: string, 
  chunks: AudioChunk[]
): Promise<string[]> => {
  const output_dir = path.join(__dirname, 'storage', 'chunks');
  await fs.promises.mkdir(output_dir, { recursive: true });

  const saveChunk = async (chunk: AudioChunk, index: number): Promise<string> => {
    const output_path = path.join(output_dir, `chunk_${index}.wav`);
    return new Promise((resolve, reject) => {
      ffmpeg(file_path)
        .setStartTime(chunk.start)
        .setDuration(chunk.end - chunk.start)
        .output(output_path)
        .on('end', () => resolve(output_path))
        .on('error', reject)
        .run();
    });
  };

  return Promise.all(chunks.map(saveChunk));
};

/**
 * Complete pipeline to process audio file and save non-silent chunks
 * Combines metadata extraction, silence detection, chunk extraction, and file saving
 * @param file_path - Path to the source audio file
 * @returns Promise that resolves to array of saved chunk file paths
 * @throws Error if any step in the pipeline fails
 * @example
 * ```typescript
 * const chunkFiles = await processAndSaveNonSilentChunks('./audio.mp3');
 * console.log(`Processed audio into ${chunkFiles.length} chunks`);
 * ```
 */
export const processAndSaveNonSilentChunks = async (file_path: string): Promise<string[]> => {
  const metadata = await getMetadata(file_path);
  const silence_intervals = await detectSilence(file_path);
  const non_silent_chunks = extractNonSilentChunks(silence_intervals, metadata.duration);
  return saveNonSilentChunks(file_path, non_silent_chunks);
};

/**
 * Converts audio file to OGG format using Vorbis codec
 * @param input_path - Path to the input audio file
 * @param output_path - Path where the OGG file should be saved
 * @returns Promise that resolves when conversion is complete
 * @throws Error if conversion fails
 * @example
 * ```typescript
 * await convertToOgg('./input.mp3', './output.ogg');
 * console.log('Conversion to OGG completed');
 * ```
 */
export const convertToOgg = async (input_path: string, output_path: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg(input_path)
      .audioCodec('libvorbis')
      .toFormat('ogg')
      .on('error', reject)
      .on('end', () => resolve())
      .save(output_path);
  });
};

/**
 * Intelligently splits audio file into meaningful segments based on silence analysis
 * Uses adaptive thresholds and filters out very short segments
 * @param file_path - Path to the audio file to split
 * @param silence_threshold_offset - Offset to add to calculated threshold in dB (default: 25)
 * @returns Promise that resolves to array of file paths for split segments
 * @throws Error if analysis or splitting fails
 * @example
 * ```typescript
 * const segments = await split('./podcast.mp3', 20);
 * console.log(`Split audio into ${segments.length} meaningful segments`);
 * ```
 */
export const split = async (
  file_path: string, 
  silence_threshold_offset = 25
): Promise<string[]> => {
  const min_silence_duration = (await getAverageSilenceDuration(file_path)) * 0.9;
  const average_silence_threshold = await getAverageSilenceThreshold(file_path);
  
  let non_silent_chunks = await detectNonSilence(
    file_path, 
    average_silence_threshold + silence_threshold_offset, 
    min_silence_duration
  );
  
  non_silent_chunks = non_silent_chunks.filter(chunk => chunk.duration >= 1);
  const chunks = await saveNonSilentChunks(file_path, non_silent_chunks);
  const ogg_chunks: string[] = [];

  for (const chunk of chunks) {
    const ogg_chunk = chunk.replace(/\.[^/.]+$/, '.ogg');
    
    if (path.extname(chunk).toLowerCase() !== '.ogg') {
      await convertToOgg(chunk, ogg_chunk);
      await fs.promises.unlink(chunk);
    } else {
      await fs.promises.copyFile(chunk, ogg_chunk);
    }
    
    const stats = await fs.promises.stat(ogg_chunk);
    if (stats.size > 20 * 1024 * 1024) {
      await fs.promises.unlink(ogg_chunk);
      throw new Error(`File ${ogg_chunk} is too big (${stats.size} bytes)`);
    }
    
    ogg_chunks.push(ogg_chunk);
  }

  return ogg_chunks;
};

// Add Zod validation schemas
export const AudioMetadataSchema = z.object({
  duration: z.number(),
  sampleRate: z.number(),
  channels: z.number(),
  bitRate: z.number(),
  codec: z.string(),
  format: z.string()
});

export const AudioLoudnessDataSchema = z.object({
  time: z.number(),
  loudness: z.number()
});

export const SilenceIntervalSchema = z.object({
  start: z.number(),
  end: z.number(),
  duration: z.number()
});

export const AudioChunkSchema = z.object({
  start: z.number(),
  end: z.number()
});

export const NonSilentIntervalSchema = z.object({
  start: z.number(),
  end: z.number(),
  duration: z.number()
});
