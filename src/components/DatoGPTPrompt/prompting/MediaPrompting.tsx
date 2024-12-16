import { motion } from 'framer-motion';
import {
  Button,
  CaretDownIcon,
  CaretUpIcon,
  Dropdown,
  DropdownMenu,
  DropdownOption,
  TextField,
} from 'datocms-react-ui';
import React from 'react';
import { availableResolutions } from '../../../utils/generate/asset/generateUploadOnPrompt';
import { availableResolutionsArray } from '../../../entrypoints/Fields/DatoGPTPrompt';

////////////////////////////////////////////////////////////////////////////////
// MediaPrompting Component File
//
// This file provides the user interface for prompting media asset generation.
// Users can enter a textual prompt, select an image resolution, and then
// request image generation (or improvement if applicable).
//
// Breakdown:
// - MediaPrompting: The main parent component handling the layout and state.
// - PromptInput: A sub-component that handles the prompt text input and the
//   final "Prompt" button.
// - ResolutionSelector: A sub-component that handles the dropdown for choosing
//   the desired image resolution.
//
// Key features:
// - Users can write a prompt in a text field.
// - Users can select a resolution from a dropdown menu.
// - Pressing "Enter" or clicking "Prompt" triggers the handleGeneratePrompt callback.
//
// PROPS:
// handleGeneratePrompt: Callback invoked when user triggers prompt generation.
// prompt: Current prompt text.
// setPrompt: Setter function for updating the prompt text.
// selectedResolution: Currently selected resolution string.
// setSelectedResolution: Function to update the selected resolution.
////////////////////////////////////////////////////////////////////////////////

type PropTypes = {
  handleGeneratePrompt: () => void;
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  selectedResolution: string;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
};

////////////////////////////////////////////////////////////////////////////////
// PromptInput Component
//
// A small sub-component dedicated to the prompt text input and the prompt button.
//
// Responsibilities:
// - Renders a TextField for the prompt text.
// - Renders a Button that triggers prompt generation when clicked.
// - Listens for "Enter" key press to trigger prompt generation for convenience.
//
// By isolating this logic, we keep the parent component cleaner and easier to maintain.
////////////////////////////////////////////////////////////////////////////////
function PromptInput({
  prompt,
  setPrompt,
  handleGeneratePrompt,
}: {
  prompt: string;
  setPrompt: React.Dispatch<React.SetStateAction<string>>;
  handleGeneratePrompt: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{ display: 'flex', gap: '4px', width: '100%' }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') handleGeneratePrompt();
      }}
    >
      {/* Text input for the prompt */}
      <TextField
        name="name"
        id="name"
        label=""
        value={prompt}
        placeholder="Write a prompt"
        onChange={(newValue) => setPrompt(newValue)}
      />

      {/* Button to initiate prompting */}
      <Button
        onClick={() => {
          handleGeneratePrompt();
        }}
        buttonSize="l"
        buttonType="muted"
      >
        Prompt
      </Button>
    </motion.div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// ResolutionSelector Component
//
// This sub-component is responsible for rendering and managing the resolution
// dropdown. The user can pick from a list of predefined resolutions.
//
// Responsibilities:
// - Show a dropdown with available resolutions.
// - Update the selected resolution when the user picks a new one.
////////////////////////////////////////////////////////////////////////////////
function ResolutionSelector({
  selectedResolution,
  setSelectedResolution,
}: {
  selectedResolution: string;
  setSelectedResolution: React.Dispatch<
    React.SetStateAction<availableResolutions>
  >;
}) {
  return (
    <div style={{ height: '100%', fontSize: 'small' }}>
      <Dropdown
        renderTrigger={({ open, onClick }) => (
          <Button
            onClick={onClick}
            rightIcon={open ? <CaretUpIcon /> : <CaretDownIcon />}
          >
            {selectedResolution}
          </Button>
        )}
      >
        <DropdownMenu>
          {availableResolutionsArray.map((resolution) => (
            <DropdownOption
              key={resolution}
              onClick={() => {
                setSelectedResolution(resolution);
              }}
            >
              {resolution}
            </DropdownOption>
          ))}
        </DropdownMenu>
      </Dropdown>
    </div>
  );
}

////////////////////////////////////////////////////////////////////////////////
// MediaPrompting Component
//
// The main component that brings together the prompt input, resolution selector,
// and the "Prompt" button into a cohesive UI.
//
// Layout:
// - A PromptInput field for the user to type their prompt and submit it.
// - A ResolutionSelector dropdown to choose image size.
//
// After all selections are made, clicking the "Prompt" button or pressing Enter
// triggers `handleGeneratePrompt` to perform the main action (e.g., generating images).
////////////////////////////////////////////////////////////////////////////////
const MediaPrompting = ({
  handleGeneratePrompt,
  prompt,
  setPrompt,
  selectedResolution,
  setSelectedResolution,
}: PropTypes) => {
  return (
    <motion.div
      // Animate component entry/exit for better UX
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      style={{
        display: 'flex',
        gap: '4px',
        marginBottom: '24px',
        width: '100%',
      }}
    >
      {/* PromptInput handles writing and submitting the prompt */}
      <PromptInput
        prompt={prompt}
        setPrompt={setPrompt}
        handleGeneratePrompt={handleGeneratePrompt}
      />

      {/* ResolutionSelector allows picking the image size */}
      <ResolutionSelector
        selectedResolution={selectedResolution}
        setSelectedResolution={setSelectedResolution}
      />
    </motion.div>
  );
};

export default MediaPrompting;
