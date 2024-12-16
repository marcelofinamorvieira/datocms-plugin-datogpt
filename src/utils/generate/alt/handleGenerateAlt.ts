//********************************************************************************************
// handleGenerateAlt.ts
//
// This utility function generates alternative text for images associated with a given field
// within a DatoCMS environment. It leverages the generateAltFromURL function to process
// individual images or galleries of images, updating the field values with the newly generated alt texts.
//********************************************************************************************

import { buildClient } from '@datocms/cma-client-browser';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import generateAltFromURL from './generateAltFromURL';
import { AnimationControls } from 'framer-motion';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { Upload } from '../asset/generateUploadOnPrompt';

/**
 * updateGalleryAlts
 * -----------------
 * Helper function to generate alt texts for a gallery field.
 *
 * @param ctx - The DatoCMS field extension context.
 * @param fieldValue - The current value of the gallery field (array of Upload objects or localized object).
 * @param pluginParams - The plugin configuration parameters.
 * @param controls - AnimationControls instance for the loading spinner animation.
 * @param setViewState - Function to update the view state of the UI.
 */
async function updateGalleryAlts(
  ctx: RenderFieldExtensionCtx,
  fieldValue: Upload[] | Record<string, Upload[]>,
  pluginParams: ctxParamsType,
  controls: AnimationControls,
  setViewState: React.Dispatch<React.SetStateAction<string>>
) {
  const client = buildClient({ apiToken: ctx.currentUserAccessToken! });

  // Determine if the fieldValue is localized:
  let images = fieldValue as Upload[];
  if (
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, Upload[]>)[ctx.locale]
  ) {
    images = (fieldValue as Record<string, Upload[]>)[ctx.locale];
  }

  // Iterate over each image in the gallery, generate alt, and update:
  for (let i = 0; i < images.length; i++) {
    const upload = await client.uploads.find(images[i].upload_id);
    let generatedAlt;
    try {
      generatedAlt = await generateAltFromURL(
        upload.url,
        pluginParams,
        ctx.locale
      );
    } catch (error) {
      ctx.customToast({
        type: 'notice',
        message: `The asset ${upload.filename} is unsupported for alt generation, it will be ignored.`,
      });
      continue;
    }
    if (generatedAlt) {
      images[i].alt = generatedAlt;
    }
  }

  // Update field with the new alt texts:
  await ctx.setFieldValue(ctx.fieldPath, images);

  finalizeOperation(ctx, controls, setViewState);
}

/**
 * updateSingleImageAlt
 * --------------------
 * Helper function to generate an alt text for a single image field.
 *
 * @param ctx - The DatoCMS field extension context.
 * @param fieldValue - The current value of the file field (Upload object or localized object).
 * @param pluginParams - The plugin configuration parameters.
 * @param controls - AnimationControls instance for the loading spinner animation.
 * @param setViewState - Function to update the view state of the UI.
 */
async function updateSingleImageAlt(
  ctx: RenderFieldExtensionCtx,
  fieldValue: Upload | Record<string, Upload>,
  pluginParams: ctxParamsType,
  controls: AnimationControls,
  setViewState: React.Dispatch<React.SetStateAction<string>>
) {
  const client = buildClient({ apiToken: ctx.currentUserAccessToken! });

  // Check for localization:
  let image: Upload = fieldValue as Upload;
  if (
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, Upload>)[ctx.locale]
  ) {
    image = (fieldValue as Record<string, Upload>)[ctx.locale];
  }

  const upload = await client.uploads.find(image.upload_id);

  let generatedAlt;
  try {
    generatedAlt = await generateAltFromURL(
      upload.url,
      pluginParams,
      ctx.locale
    );
  } catch (error) {
    ctx.customToast({
      type: 'warning',
      message: `The asset ${upload.filename} is unsupported for alt generation.`,
    });
    finalizeOperation(ctx, controls, setViewState);
    return;
  }

  image.alt = generatedAlt;
  await ctx.setFieldValue(ctx.fieldPath, image);

  finalizeOperation(ctx, controls, setViewState);
}

/**
 * finalizeOperation
 * -----------------
 * Common cleanup function to re-enable the field, stop animations, and reset UI state.
 *
 * @param ctx - The DatoCMS field extension context.
 * @param controls - AnimationControls instance for the loading spinner animation.
 * @param setViewState - Function to update the view state of the UI.
 */
function finalizeOperation(
  ctx: RenderFieldExtensionCtx,
  controls: AnimationControls,
  setViewState: React.Dispatch<React.SetStateAction<string>>
) {
  ctx.disableField(ctx.fieldPath, false);
  controls.stop();
  setViewState('collapsed');
}

/**
 * handleGenerateAlt
 * -----------------
 * Main exported function that, given a field context and a value, will generate alt text
 * for the associated image(s) using the OpenAI API. Handles both single image and gallery fields.
 *
 * Steps:
 * 1. Starts a loading state and spinner.
 * 2. Disables the field to prevent changes during generation.
 * 3. Depending on field type (gallery or single file), updates alt texts accordingly.
 * 4. Restores field state and stops the spinner after completion.
 *
 * @param ctx - The DatoCMS field extension context.
 * @param setViewState - Function to update the UI state for rendering states.
 * @param controls - AnimationControls instance for rotating/spinning icon animations.
 * @param fieldValue - The current field value (could be single image, localized image, gallery, or localized gallery).
 * @param pluginParams - The plugin configuration parameters.
 */
const handleGenerateAlt = async (
  ctx: RenderFieldExtensionCtx,
  setViewState: React.Dispatch<React.SetStateAction<string>>,
  controls: AnimationControls,
  fieldValue:
    | Upload // Single, non-localized
    | Upload[]
    | Record<string, Upload> // Localized single
    | Record<string, Upload[]>, // Localized gallery
  pluginParams: ctxParamsType
) => {
  // Set UI to loading state and start spinner:
  setViewState('collapsed');
  controls.start({
    rotate: [0, 360],
    transition: {
      rotate: {
        duration: 1,
        ease: 'linear',
        repeat: Infinity,
      },
    },
  });

  // Disable the field while processing:
  ctx.disableField(ctx.fieldPath, true);

  // Determine field type by checking the field's appearance editor:
  if (ctx.field.attributes.appearance.editor === 'gallery') {
    // Handle gallery fields:
    await updateGalleryAlts(
      ctx,
      fieldValue as Upload[] | Record<string, Upload[]>,
      pluginParams,
      controls,
      setViewState
    );
  } else {
    // Handle single file fields:
    await updateSingleImageAlt(
      ctx,
      fieldValue as Upload | Record<string, Upload>,
      pluginParams,
      controls,
      setViewState
    );
  }
};

export default handleGenerateAlt;
