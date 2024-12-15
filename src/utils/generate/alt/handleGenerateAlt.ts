import { buildClient } from '@datocms/cma-client-browser';
import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import generateAltFromURL from './generateAltFromURL';
import { AnimationControls } from 'framer-motion';
import { ctxParamsType } from '../../../entrypoints/Config/ConfigScreen';
import { Upload } from '../asset/generateUploadOnPrompt';

const handleGenerateAlt = async (
  ctx: RenderFieldExtensionCtx,
  setViewState: React.Dispatch<React.SetStateAction<string>>,
  controls: AnimationControls,
  fieldValue:
    | Upload //not localized
    | Upload[]
    | Record<string, Upload> //localized
    | Record<string, Upload[]>,
  pluginParams: ctxParamsType
) => {
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
  ctx.disableField(ctx.fieldPath, true);
  const client = buildClient({ apiToken: ctx.currentUserAccessToken! });
  if (ctx.field.attributes.appearance.editor === 'gallery') {
    let images = fieldValue as Upload[];
    if (
      typeof fieldValue === 'object' &&
      !Array.isArray(fieldValue) &&
      (fieldValue as Record<string, Upload[]>)[ctx.locale]
    ) {
      images = (fieldValue as Record<string, Upload[]>)[ctx.locale];
    }

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
          message: `The asset ${upload.filename} has an unsuported format for alt generation, it will be ignored`,
        });
        continue;
      }
      if (generatedAlt) images[i].alt = generatedAlt;
    }

    await ctx.setFieldValue(ctx.fieldPath, images);
  } else {
    let image: any = fieldValue;
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
        message: `The asset ${upload.filename} has an unsuported format for alt generation.`,
      });
      ctx.disableField(ctx.fieldPath, false);
      controls.stop();
      return;
    }

    image.alt = generatedAlt;

    await ctx.setFieldValue(ctx.fieldPath, image);
  }
  ctx.disableField(ctx.fieldPath, false);
  controls.stop();
};

export default handleGenerateAlt;
