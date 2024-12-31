//********************************************************************************************
// DatoGPTPrompt.tsx
//
// This component adds a UI overlay to a DatoCMS field that integrates with an AI (OpenAI GPT model)
// to generate, improve, or translate field values, and also handle media asset generation.
//
// Key Features:
// - Displays a small OpenAI logo icon on the field.
// - On clicking the icon, shows options to generate/improve/translate.
// - For text fields: can generate or improve value.
// - For localized fields: can translate field values.
// - For media fields: can generate new images or alt text.
// - For rich text fields: can generate/improve modular content.
// - Shows a loading spinner (rotating icon) while an operation (generate/improve/translate) is in progress.
// - Shows descriptive gray text next to the spinner, indicating what action is happening.
//
// Newly added feature:
// - When performing translation actions (like "Translate to all locales" or "Translate from main locale"),
//   display a gray text indicating what field is being translated to which locale.
//
// State variables and flow:
// - viewState: controls UI state (collapsed/options/prompting).
// - isLoadingGeneration, lastAction: track generation/improvement states and show descriptive text.
// - isLoadingTranslation, translationMessage: track translation states and show descriptive text.
// - On translation start, isLoadingTranslation = true and translationMessage is set.
// - On translation end, isLoadingTranslation = false and translationMessage cleared.
//
// Interaction with children components (DefaultOptions, ModularContentOptions):
// - Parent (DatoGPTPrompt) passes down setters to these children so they can set isLoadingTranslation and translationMessage.
// - When translation buttons are clicked in children, they set translation states, call TranslateField, and then revert states.
//
//********************************************************************************************

import { RenderFieldExtensionCtx } from 'datocms-plugin-sdk';
import { AnimatePresence, motion, useAnimation } from 'framer-motion';
import { Button, Canvas } from 'datocms-react-ui';
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

// Predefined resolutions array for image generation
export const availableResolutionsArray: availableResolutions[] = [
  '1024x1024',
  '1024x1792',
  '1792x1024',
  '256x256',
  '512x512',
];

/**
 * getValueAtPath
 * Utility function: Given a nested object and a string path (e.g. "object.child[0].key"),
 * returns the value at that path. Used for fields inside blocks.
 *
 * @param obj The object to traverse
 * @param path The dot-separated path string
 * @returns The value at the specified path or undefined if not found
 */
function getValueAtPath(obj: any, path: string): any {
  return path.split('.').reduce((acc: any, key: string) => {
    const index = Number(key);
    return Number.isNaN(index) ? acc?.[key] : acc?.[index];
  }, obj);
}

/**
 * DatoGPTPromptOptions Component (Internal)
 *
 * Depending on the current field type and viewState:
 * - For file/gallery fields: MediaOptions
 * - For rich_text fields: ModularContentOptions
 * - For other fields: DefaultOptions
 *
 * Passes down translation state setters to children.
 */
function DatoGPTPromptOptions({
  viewState,
  setViewState,
  ctx,
  pluginParams,
  controls,
  fieldValue,
  isLoadingTranslation,
  setIsLoadingTranslation,
  translationMessage,
  setTranslationMessage,
}: {
  viewState: string;
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  pluginParams: ctxParamsType;
  controls: ReturnType<typeof useAnimation>;
  fieldValue: unknown;
  isLoadingTranslation: boolean;
  setIsLoadingTranslation: React.Dispatch<React.SetStateAction<boolean>>;
  translationMessage: string;
  setTranslationMessage: React.Dispatch<React.SetStateAction<string>>;
}) {
  const fieldType = ctx.field.attributes.appearance.editor;

  if (viewState !== 'options') return null;

  if (fieldType === 'file' || fieldType === 'gallery') {
    // Media fields: show MediaOptions
    return (
      <MediaOptions
        setViewState={setViewState}
        ctx={ctx}
        fieldValue={fieldValue}
        pluginParams={pluginParams}
        controls={controls}
      />
    );
  }

  if (fieldType === 'rich_text') {
    // Rich text fields: show ModularContentOptions
    return (
      <ModularContentOptions
        setViewState={setViewState}
        ctx={ctx}
        fieldValue={fieldValue}
        pluginParams={pluginParams}
        controls={controls}
        isLoadingTranslation={isLoadingTranslation}
        setIsLoadingTranslation={setIsLoadingTranslation}
        translationMessage={translationMessage}
        setTranslationMessage={setTranslationMessage}
      />
    );
  }

  // Default text fields: DefaultOptions
  return (
    <DefaultOptions
      setViewState={setViewState}
      ctx={ctx}
      fieldValue={fieldValue}
      pluginParams={pluginParams}
      controls={controls}
      isLoadingTranslation={isLoadingTranslation}
      setIsLoadingTranslation={setIsLoadingTranslation}
      translationMessage={translationMessage}
      setTranslationMessage={setTranslationMessage}
    />
  );
}

/**
 * DatoGPTPromptPrompting Component (Internal)
 *
 * Renders the UI for prompting states (prompting or prompting-improve).
 * Chooses sub-component based on field type:
 * - file/gallery: MediaPrompting
 * - rich_text: ModularContentPrompting
 * - others: DefaultPrompting
 */
function DatoGPTPromptPrompting({
  viewState,
  prompt,
  setPrompt,
  handleGeneratePrompt,
  ctx,
  selectedResolution,
  setSelectedResolution,
}: {
  viewState: string;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleGeneratePrompt: (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => void;
  ctx: RenderFieldExtensionCtx;
  selectedResolution: availableResolutions;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
}) {
  const fieldType = ctx.field.attributes.appearance.editor;
  const isImprove = viewState === 'prompting-improve';

  if (
    (viewState === 'prompting' || viewState === 'prompting-improve') &&
    (fieldType === 'file' || fieldType === 'gallery')
  ) {
    return (
      <MediaPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        selectedResolution={selectedResolution}
        setSelectedResolution={setSelectedResolution}
      />
    );
  }

  if (
    (viewState === 'prompting' || viewState === 'prompting-improve') &&
    fieldType === 'rich_text'
  ) {
    return (
      <ModularContentPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        isImprove={isImprove}
        ctx={ctx}
      />
    );
  }

  if (viewState === 'prompting' || viewState === 'prompting-improve') {
    return (
      <DefaultPrompting
        handleGeneratePrompt={handleGeneratePrompt}
        prompt={prompt}
        setPrompt={setPrompt}
        isImprove={isImprove}
      />
    );
  }

  return null;
}

/**
 * DatoGPTPrompt Component
 *
 * Main exported component:
 * - Renders an icon and provides a UI for generating/improving/translating field values.
 * - Has states for loading generation or translation.
 * - Displays descriptive gray text during operations.
 */
export default function DatoGPTPrompt({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const fieldType = ctx.field.attributes.appearance.editor;

  let fieldValue =
    ctx.formValues[ctx.field.attributes.api_key] ||
    (ctx.parentField?.attributes.localized &&
      getValueAtPath(ctx.formValues, ctx.fieldPath));

  const controls = useAnimation();

  const [viewState, setViewState] = useState('collapsed');
  const [isSpinning, setIsSpinning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');

  // States for generation/improvement loading
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [lastAction, setLastAction] = useState<'generate' | 'improve' | null>(
    null
  );

  // States for translation loading
  const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
  const [translationMessage, setTranslationMessage] = useState('');

  if (
    !pluginParams ||
    !pluginParams.gptModel ||
    pluginParams.gptModel === 'None' ||
    !(
      pluginParams.dallEModel === 'dall-e-3' ||
      pluginParams.dallEModel === 'dall-e-2'
    )
  ) {
    return (
      <Button
        onClick={() =>
          ctx.navigateTo('/configuration/plugins/' + ctx.plugin.id + '/edit')
        }
      >
        Please insert a valid API Key and select a GPT Model
      </Button>
    );
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

  // Determine if field is empty or localized to handle conditions
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

  // If none of the actions apply, return empty
  if (
    ((fieldType === 'file' || fieldType === 'gallery') &&
      !pluginParams.advancedSettings.mediaFieldsPermissions &&
      !pluginParams.advancedSettings.generateAlts) ||
    (!(
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
    ) &&
      !pluginParams.advancedSettings.mediaFieldsPermissions)
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
    !pluginParams.advancedSettings.translationFields.includes(
      fieldType as keyof typeof translateFieldTypes
    )
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

  /**
   * handleGeneratePrompt
   *
   * Called when user submits prompt to generate/improve field value.
   * Disables field, sets loading state, shows spinner and descriptive text for generation.
   */
  const handleGeneratePrompt = (blockType?: {
    name: string;
    apiKey: string;
    blockModelId: string;
    blockLevel: number;
    availableBlocks: string[];
  }) => {
    ctx.disableField(ctx.fieldPath, true);
    setViewState('collapsed');

    const isImprove = viewState === 'prompting-improve';
    setLastAction(isImprove ? 'improve' : 'generate');
    setIsLoadingGeneration(true);

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
      isImprove,
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
        setPrompt('');
        ctx.setFieldValue(ctx.fieldPath, result);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
        setIsLoadingGeneration(false);
      })
      .catch((error) => {
        setPrompt('');
        ctx.alert(error);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
        setIsLoadingGeneration(false);
      });
  };

<<<<<<< Updated upstream
=======
  /**
   * Conditional rendering:
   * - If there are no applicable actions for this field, return empty.
   * - Otherwise, show the main UI with the icon and either options or prompting states.
   */

  // Check conditions to ensure there's at least one action (generate/improve/translate) applicable
  // If no action applies, return empty to avoid cluttering the UI.
  // These checks replicate logic from the original code to ensure nothing breaks.
  // For brevity, we trust existing logic and conditions as is.

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

  // If conditions to show/hide the UI fail, return nothing
  // (These conditions remain as in the original code, ensuring no functional changes)
  if (
    ((fieldType === 'file' || fieldType === 'gallery') &&
      !pluginParams.advancedSettings.mediaFieldsPermissions &&
      !pluginParams.advancedSettings.generateAlts) ||
    (!(
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
    ) &&
      !pluginParams.advancedSettings.mediaFieldsPermissions)
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
    !pluginParams.advancedSettings.translationFields.includes(
      fieldType as keyof typeof translateFieldTypes
    )
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

  // Render the main UI with icon and conditional panels
>>>>>>> Stashed changes
  return (
    <Canvas ctx={ctx}>
      <div className={classNames(s.optionContainer)}>
        <AnimatePresence>
          <DatoGPTPromptOptions
            viewState={viewState}
            setViewState={setViewState}
            ctx={ctx}
            pluginParams={pluginParams}
            controls={controls}
            fieldValue={fieldValue}
            isLoadingTranslation={isLoadingTranslation}
            setIsLoadingTranslation={setIsLoadingTranslation}
            translationMessage={translationMessage}
            setTranslationMessage={setTranslationMessage}
          />
        </AnimatePresence>

        <AnimatePresence>
          <DatoGPTPromptPrompting
            viewState={viewState}
            prompt={prompt}
            setPrompt={setPrompt}
            handleGeneratePrompt={handleGeneratePrompt}
            ctx={ctx}
            selectedResolution={selectedResolution}
            setSelectedResolution={setSelectedResolution}
          />
        </AnimatePresence>

        {/* Show descriptive text during generation */}
        {isLoadingGeneration && (
          <span style={{ color: 'gray', marginRight: '8px' }}>
            {lastAction === 'improve'
              ? `Improving ${ctx.field.attributes.label}...`
              : `Generating ${ctx.field.attributes.label}...`}
          </span>
        )}

        {/* Show descriptive text during translation */}
        {isLoadingTranslation && (
          <span style={{ color: 'gray', marginRight: '8px' }}>
            {translationMessage}
          </span>
        )}

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