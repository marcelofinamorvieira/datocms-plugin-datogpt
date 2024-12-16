import { buildClient } from '@datocms/cma-client-browser';
import OpenAI from 'openai';

export function toKebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

export async function imageUrlToBlob(imageUrl: string) {
  const response = await fetch(
    `https://api.cors.lol/?url=${encodeURIComponent(imageUrl)}`
  );

  const blob = await response.blob();
  return blob;
}

export type availableResolutions =
  | '1024x1024'
  | '256x256'
  | '512x512'
  | '1792x1024'
  | '1024x1792';

export type Upload = { upload_id: string; title: string; alt: string };

const generateUploadOnPrompt = async (
  prompt: string,
  openai: OpenAI,
  datoToken: string,
  locale: string,
  dallEModel = 'dall-e-3',
  resolution: availableResolutions = '1024x1024',
  numberOfImages = 1
) => {
  const response = await openai.images.generate({
    model: dallEModel ?? 'dall-e-3',
    prompt: prompt,
    n: numberOfImages,
    size: resolution,
  });

  const datoClient = buildClient({ apiToken: datoToken });

  const uploads: Upload[] = [];

  for (let i = 0; i < response.data.length; i++) {
    const upload = await datoClient.uploads.createFromFileOrBlob({
      fileOrBlob: await imageUrlToBlob(response.data[i].url as string),
      filename: toKebabCase(prompt) + '.png',
      default_field_metadata: {
        [locale]: {
          title: prompt,
          alt: response.data[i].revised_prompt,
          custom_data: {},
        },
      },
    });
    uploads.push({
      upload_id: upload.id,
      title: prompt,
      alt: response.data[i].revised_prompt as string,
    });
  }

  return uploads;
};

export default generateUploadOnPrompt;
