//********************************************************************************************
// generateUploadOnPrompt.ts
//
// This utility function interacts with OpenAI to generate images based on a given prompt,
// then uploads those images as assets to DatoCMS. It supports various resolutions and returns
// metadata needed to update fields in the CMS.
//********************************************************************************************

import { buildClient } from '@datocms/cma-client-browser';
import OpenAI from 'openai';

/**
 * toKebabCase
 * -----------
 * Utility function to transform a string into kebab-case format.
 *
 * @param str - The original string to transform.
 * @returns The kebab-cased string.
 */
export function toKebabCase(str: string) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * imageUrlToBlob
 * --------------
 * Fetches an image from a given URL and returns its Blob representation.
 * Uses a CORS proxy to ensure the image can be fetched safely.
 *
 * @param imageUrl - The URL of the image to fetch.
 * @returns A Blob of the image data.
 */
export async function imageUrlToBlob(imageUrl: string) {
  const response = await fetch(
    `https://api.cors.lol/?url=${encodeURIComponent(imageUrl)}`
  );
  const blob = await response.blob();
  return blob;
}

/**
 * availableResolutions
 * ---------------------
 * A union type listing the supported image resolutions.
 */
export type availableResolutions =
  | '1024x1024'
  | '256x256'
  | '512x512'
  | '1792x1024'
  | '1024x1792';

/**
 * Upload
 * ------
 * This type represents the object returned by the function, containing the
 * upload ID, as well as the original prompt and alt text used in the asset.
 */
export type Upload = { upload_id: string; title: string; alt: string };

/**
 * uploadImageToDatoCMS
 * --------------------
 * A helper function to upload a single image (provided as a Blob) to DatoCMS.
 * Sets default metadata (title, alt) based on the prompt and revised prompt.
 *
 * @param datoClient - A pre-configured DatoCMS client instance.
 * @param imageBlob - The image as a Blob.
 * @param prompt - The original prompt used to generate the image.
 * @param revisedPrompt - The revised prompt returned by the OpenAI API.
 * @param locale - The locale to set for the asset's metadata.
 * @returns An Upload object containing details about the uploaded asset.
 */
async function uploadImageToDatoCMS(
  datoClient: ReturnType<typeof buildClient>,
  imageBlob: Blob,
  prompt: string,
  revisedPrompt: string,
  locale: string
): Promise<Upload> {
  const upload = await datoClient.uploads.createFromFileOrBlob({
    fileOrBlob: imageBlob,
    filename: toKebabCase(prompt) + '.png',
    default_field_metadata: {
      [locale]: {
        title: prompt,
        alt: revisedPrompt,
        custom_data: {},
      },
    },
  });

  return {
    upload_id: upload.id,
    title: prompt,
    alt: revisedPrompt,
  };
}

/**
 * generateUploadOnPrompt
 * ----------------------
 * Main function to:
 * 1. Generate images using the OpenAI API (Dall-E model).
 * 2. Convert them into Blobs.
 * 3. Upload them to DatoCMS.
 * 4. Return an array of Upload objects representing the newly created assets.
 *
 * Parameters:
 * @param prompt - The textual prompt to guide image generation.
 * @param openai - A configured instance of the OpenAI client.
 * @param datoToken - A valid DatoCMS API token for asset uploads.
 * @param locale - The locale to assign to the new assets' metadata.
 * @param dallEModel - The Dall-E model to use for image generation (default: 'dall-e-3').
 * @param resolution - The chosen image resolution.
 * @param numberOfImages - How many images to generate.
 *
 * Process:
 * 1. Generate images via openai.images.generate.
 * 2. For each generated image URL, fetch it and convert to Blob.
 * 3. Upload each Blob as an asset to DatoCMS.
 * 4. Return an array of Upload metadata.
 *
 * No changes to arguments or return structure, ensuring no break in existing usage.
 */
const generateUploadOnPrompt = async (
  prompt: string,
  openai: OpenAI,
  datoToken: string,
  locale: string,
  dallEModel = 'dall-e-3',
  resolution: availableResolutions = '1024x1024',
  numberOfImages = 1
) => {
  // Step 1: Generate images from OpenAI
  const response = await openai.images.generate({
    model: dallEModel ?? 'dall-e-3',
    prompt: prompt,
    n: numberOfImages,
    size: resolution,
  });

  const datoClient = buildClient({ apiToken: datoToken });

  const uploads: Upload[] = [];

  // Step 2: For each generated image, fetch as Blob, then upload:
  for (let i = 0; i < response.data.length; i++) {
    const generatedImageUrl = response.data[i].url as string;
    const revisedPrompt = response.data[i].revised_prompt as string;

    // Convert image URL to Blob:
    const imageBlob = await imageUrlToBlob(generatedImageUrl);

    // Upload image Blob to DatoCMS:
    const upload = await uploadImageToDatoCMS(
      datoClient,
      imageBlob,
      prompt,
      revisedPrompt,
      locale
    );

    uploads.push(upload);
  }

  return uploads;
};

export default generateUploadOnPrompt;
