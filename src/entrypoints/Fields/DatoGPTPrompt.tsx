import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { Canvas } from 'datocms-react-ui';
import { useState } from 'react';
import s from '../styles.module.css';
import { AiOutlineOpenAI } from 'react-icons/ai';
import classNames from 'classnames';
import { ctxParamsType } from '../Config/ConfigScreen';
import generateFieldValue from '../../utils/generate/fieldValue/generateFieldValue';
import DefaultOptions from '../../components/DatoGPTPrompt/options/DefaultOptions';
import DefaultPrompting from '../../components/DatoGPTPrompt/prompting/DefaultPrompting';
import MediaOptions from '../../components/DatoGPTPrompt/options/MediaOptions';
import MediaPrompting from '../../components/DatoGPTPrompt/prompting/MediaPrompting';
import {
  availableResolutions,
  Upload,
} from '../../utils/generate/asset/generateUploadOnPrompt';
import ModularContentOptions from '../../components/DatoGPTPrompt/options/ModularContentOptions';
import ModularContentPrompting from '../../components/DatoGPTPrompt/prompting/ModularContentPrompting';
import {
  textFieldTypes,
  translateFieldTypes,
} from '../Config/AdvancedSettings';
import { fieldsThatDontNeedTranslation } from '../../utils/TranslateField';

type PropTypes = {
  ctx: RenderFieldExtensionCtx;
};

export const availableResolutionsArray: availableResolutions[] = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '256x256',
  '512x512',
];

export default function DatoGPTPrompt({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const fieldType = ctx.field.attributes.appearance.editor;
  const fieldValue = ctx.formValues[ctx.field.attributes.api_key];

  const controls = useAnimation();
  const [viewState, setViewState] = useState('collapsed');
  const [isSpinning, setIsSpinning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');

  if (
    !pluginParams ||
    !pluginParams.gptModel ||
    pluginParams.gptModel === 'None'
  )
    return <>Please insert a valid API Key and select a GPT Model</>;

  //all of these conditions bellow are to hide the menu if there are no options to show for the field
  //i really should refactor this code
  //it works but it's really hard to read and could be better TODO
  if (
    //hide menu if there are no options to show for assets
    ((fieldType === 'file' || fieldType === 'gallery') &&
      !pluginParams.advancedSettings.mediaFieldsPermissions &&
      !pluginParams.advancedSettings.generateAlts) ||
    (!(
      //this long condition checks if the field is not empty even if its localized or not and if its a gallery or single asset
      (
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          (fieldValue as Upload)?.upload_id) ||
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload)
            ?.upload_id) ||
        (!Array.isArray(fieldValue) &&
          typeof fieldValue === 'object' &&
          ((fieldValue as Record<string, unknown>)?.[ctx.locale] as Upload[])
            ?.length > 0) ||
        (Array.isArray(fieldValue) && fieldValue.length > 0)
      )
    ) &&
      !pluginParams.advancedSettings.mediaFieldsPermissions)
  ) {
    return <></>;
  }

  if (
    //hide menu if there are no options to show for text fields
    !(
      fieldType === 'file' ||
      fieldType === 'gallery' ||
      fieldType === 'rich_text'
    ) &&
    !pluginParams.advancedSettings.generateValueFields.includes(
      fieldType as keyof typeof textFieldTypes
    ) &&
    !pluginParams.advancedSettings.improveValueFields.includes(
      fieldType as keyof typeof textFieldTypes
    ) &&
    !pluginParams.advancedSettings.translationFields.includes(
      fieldType as keyof typeof translateFieldTypes
    )
  ) {
    return <></>;
  }

  let isEmptyStructuredText =
    fieldType === 'structured_text' &&
    Array.isArray(fieldValue) &&
    fieldValue.length === 1 &&
    typeof fieldValue[0] === 'object' &&
    fieldValue[0] !== null &&
    'type' in fieldValue[0] &&
    fieldValue[0].type === 'paragraph' &&
    fieldValue[0].children.length === 1 &&
    fieldValue[0].children[0].text === '';

  let hasFieldValueInThisLocale = !!fieldValue && !isEmptyStructuredText;

  const hasOtherLocales =
    Array.isArray(ctx.formValues.internalLocales) &&
    ctx.formValues.internalLocales.length > 1;

  const isLocalized = !!(
    !fieldsThatDontNeedTranslation.includes(fieldType) &&
    hasOtherLocales &&
    !ctx.parentField &&
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    (fieldValue as Record<string, unknown>)[
      (ctx.formValues.internalLocales as string[])[0]
    ]
  );

  if (
    //if the field is localized
    fieldValue &&
    typeof fieldValue === 'object' &&
    !Array.isArray(fieldValue) &&
    ctx.locale in (fieldValue as Record<string, unknown>)
  ) {
    const fieldValueInThisLocale = (fieldValue as Record<string, unknown>)[
      ctx.locale
    ];

    isEmptyStructuredText =
      fieldType === 'structured_text' &&
      Array.isArray(fieldValueInThisLocale) &&
      fieldValueInThisLocale.length === 1 &&
      typeof fieldValueInThisLocale[0] === 'object' &&
      fieldValueInThisLocale[0] !== null &&
      'type' in fieldValueInThisLocale[0] &&
      fieldValueInThisLocale[0].type === 'paragraph' &&
      fieldValueInThisLocale[0].children.length === 1 &&
      fieldValueInThisLocale[0].children[0].text === '';

    hasFieldValueInThisLocale =
      !!fieldValueInThisLocale && !isEmptyStructuredText;
  }

  if (
    !(
      fieldType === 'file' ||
      fieldType === 'gallery' ||
      fieldType === 'rich_text'
    ) &&
    !pluginParams.advancedSettings.generateValueFields.includes(
      fieldType as keyof typeof textFieldTypes
    ) &&
    !hasFieldValueInThisLocale
  ) {
    return <></>;
  }

  if (
    !(
      fieldType === 'file' ||
      fieldType === 'gallery' ||
      fieldType === 'rich_text'
    ) &&
    !pluginParams.advancedSettings.generateValueFields.includes(
      fieldType as keyof typeof textFieldTypes
    ) &&
    !pluginParams.advancedSettings.improveValueFields.includes(
      fieldType as keyof typeof textFieldTypes
    ) &&
    !isLocalized
  ) {
    return <></>;
  }

  const toggleOptions = () => {
    if (viewState === 'collapsed') {
      setViewState('options');
    } else {
      setViewState('collapsed');
    }
  };

  const handleLogoClick = () => {
    if (!isSpinning) {
      controls.start({ rotate: 180 });
    } else {
      controls.start({ rotate: 0 });
    }
    setIsSpinning(!isSpinning);
    toggleOptions();
  };

  const handleGeneratePrompt = (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => {
    ctx.disableField(ctx.fieldPath, true);
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

    const fieldsetInfo = ctx.field.relationships.fieldset.data?.id
      ? {
          name:
            ctx.fieldsets[ctx.field.relationships.fieldset.data?.id]?.attributes
              .title ?? null,
          hint:
            ctx.fieldsets[ctx.field.relationships.fieldset.data?.id]?.attributes
              .hint ?? null,
        }
      : null;

    generateFieldValue(
      0,
      ctx.itemTypes,
      prompt,
      fieldType,
      pluginParams,
      ctx.locale,
      ctx.currentUserAccessToken!,
      selectedResolution,
      fieldValue,
      ctx.alert,
      viewState === 'prompting-improve',
      {
        name: ctx.field.attributes.label,
        apiKey: ctx.field.attributes.api_key,
        validatiors: ctx.field.attributes.validators
          ? JSON.stringify(ctx.field.attributes.validators, null, 2)
          : null,
        hint: ctx.field.attributes.hint
          ? JSON.stringify(ctx.field.attributes.hint, null, 2)
          : null,
      },
      ctx.formValues,
      blockType ?? null,
      null,
      fieldsetInfo,
      ctx.itemType.attributes.name
    )
      .then((result) => {
        ctx.setFieldValue(ctx.fieldPath, result);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
      })
      .catch((error) => {
        ctx.alert(error);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
      });
  };

  return (
    <Canvas ctx={ctx}>
      <div className={classNames(s.optionContainer)}>
        <AnimatePresence>
          {viewState === 'options' &&
            !(
              fieldType === 'file' ||
              fieldType === 'gallery' ||
              fieldType === 'rich_text'
            ) && (
              <DefaultOptions
                setViewState={setViewState}
                ctx={ctx}
                pluginParams={pluginParams}
                controls={controls}
                fieldValue={fieldValue}
              />
            )}
          {viewState === 'options' &&
            (fieldType === 'file' || fieldType === 'gallery') && (
              <MediaOptions
                setViewState={setViewState}
                ctx={ctx}
                fieldValue={fieldValue}
                pluginParams={pluginParams}
                controls={controls}
              />
            )}
          {viewState === 'options' && fieldType === 'rich_text' && (
            <ModularContentOptions
              setViewState={setViewState}
              ctx={ctx}
              fieldValue={fieldValue}
              pluginParams={pluginParams}
              controls={controls}
            />
          )}
        </AnimatePresence>
        <AnimatePresence>
          {(viewState === 'prompting' || viewState === 'prompting-improve') &&
            !(
              fieldType === 'file' ||
              fieldType === 'gallery' ||
              fieldType === 'rich_text'
            ) && (
              <DefaultPrompting
                handleGeneratePrompt={handleGeneratePrompt}
                prompt={prompt}
                setPrompt={setPrompt}
                isImprove={viewState === 'prompting-improve'}
              />
            )}
          {viewState === 'prompting' &&
            (fieldType === 'file' || fieldType === 'gallery') && (
              <MediaPrompting
                handleGeneratePrompt={handleGeneratePrompt}
                prompt={prompt}
                setPrompt={setPrompt}
                isGallery={fieldType === 'gallery'}
                selectedResolution={selectedResolution}
                setSelectedResolution={setSelectedResolution}
              />
            )}
          {(viewState === 'prompting' || viewState === 'prompting-improve') &&
            fieldType === 'rich_text' && (
              <ModularContentPrompting
                handleGeneratePrompt={handleGeneratePrompt}
                prompt={prompt}
                setPrompt={setPrompt}
                isImprove={viewState === 'prompting-improve'}
                ctx={ctx}
              />
            )}
        </AnimatePresence>
        <span className={classNames(s.gptOptions)}>
          <motion.div
            animate={controls}
            transition={{ duration: 0.5 }}
            onClick={handleLogoClick}
            style={{
              width: 20,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transformOrigin: 'center',
            }}
          >
            <AiOutlineOpenAI size={20} />
          </motion.div>
        </span>
      </div>
    </Canvas>
  );
}
