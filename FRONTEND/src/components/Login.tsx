import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  useToast,
} from '@chakra-ui/react';
import { useAuthStore } from '../store/authStore';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading, error } = useAuthStore();
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
      });
    } catch (err) {
      toast({
        title: 'Login failed',
        description: error || 'Please check your credentials',
        status: 'error',
        duration: 5000,
      });
    }
  };

  return (
    <Box maxW="md" mx="auto" mt={8} p={6} borderWidth={1} borderRadius="lg">
      <form onSubmit={handleSubmit}>
        <VStack spacing={4}>
          <Text fontSize="2xl" fontWeight="bold">
            Login
          </Text>
          <FormControl isRequired>
            <FormLabel>Email</FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </FormControl>
          <FormControl isRequired>
            <FormLabel>Password</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </FormControl>
          <Button
            type="submit"
            colorScheme="blue"
            width="full"
            isLoading={isLoading}
          >
            Login
          </Button>
        </VStack>
      </form>
    </Box>
  );
}; 