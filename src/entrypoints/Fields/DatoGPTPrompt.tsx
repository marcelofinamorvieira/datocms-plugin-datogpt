//********************************************************************************************
// DatoGPTPrompt.tsx
//
// This component adds a UI overlay to a DatoCMS field that integrates with an AI (OpenAI GPT model)
// to generate, improve, or translate field values, and also handle media asset generation.
//
// Key Features:
// - Displays a small OpenAI logo icon on the field.
// - On clicking the icon, shows options to generate a new value, improve existing value, or translate.
// - For media fields, can generate and upload new images.
// - For rich text fields, can handle block generation.
// - Shows a loading spinner (rotating icon) while generation/improvement is in progress.
// - Newly added feature: displays a gray descriptive text next to the rotating logo indicating what
//   action is being performed (e.g., "Generating Title..." or "Improving Description...").
//
// The component uses several states to manage UI (viewState: collapsed, options, prompting, etc.)
// and to control animations. When a prompt is submitted, it calls a utility function (generateFieldValue)
// to fetch AI-generated content and updates the field value.
//********************************************************************************************

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
 * Renders the "options" state UI. Depending on the field type and plugin configuration:
 * - For file/gallery fields: shows MediaOptions (generate image, alt text, etc.)
 * - For rich_text fields: shows ModularContentOptions (generate/improve blocks)
 * - For other text fields: shows DefaultOptions (generate/improve/translate text)
 *
 * @param viewState The current state of the UI (e.g. 'options')
 * @param setViewState Function to update viewState
 * @param ctx The DatoCMS field extension context
 * @param pluginParams Plugin configuration parameters
 * @param controls Animation controls for icon rotation
 * @param fieldValue Current value of the field
 */
function DatoGPTPromptOptions({
  viewState,
  setViewState,
  ctx,
  pluginParams,
  controls,
  fieldValue,
}: {
  viewState: string;
  setViewState: React.Dispatch<React.SetStateAction<string>>;
  ctx: RenderFieldExtensionCtx;
  pluginParams: ctxParamsType;
  controls: ReturnType<typeof useAnimation>;
  fieldValue: unknown;
}) {
  const fieldType = ctx.field.attributes.appearance.editor;

  if (viewState !== 'options') return null; // Only render in options state

  if (fieldType === 'file' || fieldType === 'gallery') {
    // Media fields
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
    // Rich text fields
    return (
      <ModularContentOptions
        setViewState={setViewState}
        ctx={ctx}
        fieldValue={fieldValue}
        pluginParams={pluginParams}
        controls={controls}
      />
    );
  }

  // Default (text) fields
  return (
    <DefaultOptions
      setViewState={setViewState}
      ctx={ctx}
      fieldValue={fieldValue}
      pluginParams={pluginParams}
      controls={controls}
    />
  );
}

/**
 * DatoGPTPromptPrompting Component (Internal)
 *
 * Renders the UI for the "prompting" states (when user is entering a prompt to generate/improve).
 * Which UI is displayed depends on field type:
 * - MediaPrompting for file/gallery
 * - ModularContentPrompting for rich_text
 * - DefaultPrompting for text fields
 *
 * @param viewState Current state ('prompting' or 'prompting-improve')
 * @param prompt Current user-entered prompt
 * @param setPrompt Setter for prompt
 * @param handleGeneratePrompt Function triggered on prompt submission
 * @param ctx Field context
 * @param selectedResolution For media fields, the chosen resolution
 * @param setSelectedResolution Setter for chosen resolution
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
    // Media fields: MediaPrompting
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
    // Rich text fields: ModularContentPrompting
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

  // Default (text) fields: DefaultPrompting
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
 * Main exported component that:
 * - Shows a small OpenAI icon on the field.
 * - Clicking the icon toggles between collapsed and options state.
 * - If user chooses to generate/improve a value, transitions to prompting state.
 * - Once a prompt is submitted, starts a spinner and shows descriptive text while generating/improving.
 * - After generation completes, updates field value and stops spinner.
 *
 * State variables:
 * - viewState: 'collapsed' | 'options' | 'prompting' | 'prompting-improve'
 * - isSpinning: controls if the icon is rotated (spinner)
 * - prompt: user-entered prompt text
 * - selectedResolution: for media fields image resolution
 * - isLoadingGeneration: new state to indicate if generation is in progress
 * - lastAction: 'generate' or 'improve', to know what to show in descriptive text
 *
 * Lifecycle:
 * - Initially collapsed (just icon).
 * - Click icon -> show options.
 * - Choose an action (generate/improve) -> show prompting UI.
 * - Submit prompt -> start spinner, show descriptive text, call generateFieldValue.
 * - On success/failure -> stop spinner, clear prompt, show final result.
 */
export default function DatoGPTPrompt({ ctx }: PropTypes) {
  const pluginParams = ctx.plugin.attributes.parameters as ctxParamsType;
  const fieldType = ctx.field.attributes.appearance.editor;

  // Extract field value, handle fields inside blocks if needed
  let fieldValue =
    ctx.formValues[ctx.field.attributes.api_key] ||
    (ctx.parentField?.attributes.localized &&
      getValueAtPath(ctx.formValues, ctx.fieldPath));

  // Animation controls for the icon rotation
  const controls = useAnimation();

  // UI states
  const [viewState, setViewState] = useState('collapsed');
  const [isSpinning, setIsSpinning] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [selectedResolution, setSelectedResolution] =
    useState<availableResolutions>('1024x1024');

  // New states for showing descriptive text during generation
  const [isLoadingGeneration, setIsLoadingGeneration] = useState(false);
  const [lastAction, setLastAction] = useState<'generate' | 'improve' | null>(
    null
  );

  // If plugin is not configured properly, show a message
  if (
    !pluginParams ||
    !pluginParams.gptModel ||
    pluginParams.gptModel === 'None'
  ) {
    return <>Please insert a valid API Key and select a GPT Model</>;
  }

  /**
   * toggleOptions
   *
   * Toggles between collapsed and options states when the icon is clicked.
   */
  const toggleOptions = () => {
    if (viewState === 'collapsed') {
      setViewState('options');
    } else {
      setViewState('collapsed');
    }
  };

  /**
   * handleLogoClick
   *
   * Called when the OpenAI icon is clicked:
   * - Rotates the icon by 180° if not spinning, else back to 0° if spinning.
   * - Toggles between states to show/hide options.
   */
  const handleLogoClick = () => {
    if (!isSpinning) {
      controls.start({ rotate: 180 });
    } else {
      controls.start({ rotate: 0 });
    }
    setIsSpinning(!isSpinning);
    toggleOptions();
  };

  /**
   * handleGeneratePrompt
   *
   * Called when user submits a prompt to generate or improve the field value.
   * - Disables the field editing
   * - Sets isLoadingGeneration to true, showing descriptive text
   * - Starts the spinner animation
   * - Calls generateFieldValue utility
   *
   * @param blockType Optional block type info for rich_text fields
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

    // Determine if we are improving or generating
    const isImprove = viewState === 'prompting-improve';
    setLastAction(isImprove ? 'improve' : 'generate');

    // Indicate loading/generation in progress
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
        // Done generating, remove loading state
        setIsLoadingGeneration(false);
      })
      .catch((error) => {
        setPrompt('');
        ctx.alert(error);
        ctx.disableField(ctx.fieldPath, false);
        controls.stop();
        // On error, also remove loading state
        setIsLoadingGeneration(false);
      });
  };

  // Additional logic to determine if actions are available:
  // The following checks ensure that if no actions (generate/improve/translate)
  // apply to this field, we return empty to avoid cluttering UI.

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

  // Render the UI
  return (
    <Canvas ctx={ctx}>
      <div className={classNames(s.optionContainer)}>
        {/* AnimatePresence for smooth transitions */}
        <AnimatePresence>
          {/* Options Panel */}
          <DatoGPTPromptOptions
            viewState={viewState}
            setViewState={setViewState}
            ctx={ctx}
            pluginParams={pluginParams}
            controls={controls}
            fieldValue={fieldValue}
          />
        </AnimatePresence>

        <AnimatePresence>
          {/* Prompting Panel (if in prompting/improve state) */}
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

        {/* When loading (generating/improving), show descriptive text next to spinner */}
        {isLoadingGeneration && (
          <span style={{ color: 'gray', marginRight: '8px' }}>
            {lastAction === 'improve'
              ? `Improving ${ctx.field.attributes.label}...`
              : `Generating ${ctx.field.attributes.label}...`}
          </span>
        )}

        {/* The main icon that toggles states */}
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
