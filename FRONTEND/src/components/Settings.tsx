import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  Select,
  Switch,
  VStack,
  useColorMode,
} from '@chakra-ui/react';
import { useSettingsStore } from '../store/settingsStore';

export const Settings = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const {
    fontSize,
    soundEnabled,
    notificationsEnabled,
    setFontSize,
    toggleSound,
    toggleNotifications,
  } = useSettingsStore();

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <VStack spacing={6} align="stretch">
        <Heading size="lg">Settings</Heading>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="theme" mb="0">
            Dark Mode
          </FormLabel>
          <Switch
            id="theme"
            isChecked={colorMode === 'dark'}
            onChange={toggleColorMode}
          />
        </FormControl>

        <FormControl>
          <FormLabel>Font Size</FormLabel>
          <Select value={fontSize} onChange={(e) => setFontSize(e.target.value as any)}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </Select>
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="sound" mb="0">
            Sound Effects
          </FormLabel>
          <Switch id="sound" isChecked={soundEnabled} onChange={toggleSound} />
        </FormControl>

        <FormControl display="flex" alignItems="center">
          <FormLabel htmlFor="notifications" mb="0">
            Notifications
          </FormLabel>
          <Switch
            id="notifications"
            isChecked={notificationsEnabled}
            onChange={toggleNotifications}
          />
        </FormControl>

        <Button colorScheme="blue" onClick={() => window.location.reload()}>
          Apply Changes
        </Button>
      </VStack>
    </Box>
  );
}; 