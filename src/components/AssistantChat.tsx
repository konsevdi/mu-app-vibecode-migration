import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMutation, useQuery } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Sparkles,
} from "lucide-react-native";
import { api } from "@/lib/api";
import { useLanguageStore } from "@/lib/languageStore";
import * as Haptics from "expo-haptics";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatResponse {
  reply: string;
  suggestions: string[];
  timestamp: string;
}

interface SuggestionsResponse {
  suggestions: string[];
  page: string;
}

interface AssistantChatProps {
  context?: {
    listingId?: string;
    category?: string;
    page?: string;
  };
}

export function AssistantChat({ context }: AssistantChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const scrollViewRef = useRef<ScrollView>(null);
  const language = useLanguageStore((s) => s.language);

  const fabScale = useSharedValue(1);

  // Fetch initial suggestions based on context
  const { data: suggestionsData } = useQuery({
    queryKey: ["assistant", "suggestions", context?.page, language],
    queryFn: () =>
      api.get<SuggestionsResponse>(
        `/api/assistant/suggestions?page=${context?.page ?? "home"}&language=${language}`
      ),
    enabled: isOpen && messages.length === 0,
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: (message: string) =>
      api.post<ChatResponse>("/api/assistant/chat", {
        message,
        context,
        language,
      }),
    onSuccess: (data) => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    },
  });

  const handleOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsOpen(true);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsOpen(false);
    Keyboard.dismiss();
  };

  const handleSend = () => {
    if (!inputText.trim() || sendMessageMutation.isPending) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    sendMessageMutation.mutate(inputText.trim());
    setInputText("");
  };

  const handleSuggestionPress = (suggestion: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText(suggestion);
    // Auto-send the suggestion
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: suggestion,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    sendMessageMutation.mutate(suggestion);
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // FAB animation
  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: fabScale.value }],
  }));

  const handleFabPressIn = () => {
    fabScale.value = withSpring(0.9);
  };

  const handleFabPressOut = () => {
    fabScale.value = withSpring(1);
  };

  // Get suggestions to display
  const suggestions =
    sendMessageMutation.data?.suggestions ?? suggestionsData?.suggestions ?? [];

  if (!isOpen) {
    // Floating Action Button
    return (
      <Animated.View
        style={[
          {
            position: "absolute",
            bottom: 100,
            right: 20,
            zIndex: 1000,
          },
          fabAnimatedStyle,
        ]}
      >
        <Pressable
          onPress={handleOpen}
          onPressIn={handleFabPressIn}
          onPressOut={handleFabPressOut}
          accessibilityRole="button"
          accessibilityLabel={language === "el" ? "Άνοιξε τον βοηθό" : "Open assistant"}
        >
          <LinearGradient
            colors={["#FF00FF", "#CC00CC"]}
            style={{
              width: 60,
              height: 60,
              borderRadius: 30,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: "#FF00FF",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}
          >
            <MessageCircle size={28} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    );
  }

  // Chat Panel
  return (
    <Animated.View
      entering={SlideInDown.springify().damping(20)}
      exiting={SlideOutDown.springify().damping(20)}
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: "70%",
        zIndex: 1000,
      }}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={["#1a1a2e", "#0f0f23"]}
          style={{
            flex: 1,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderWidth: 2,
            borderColor: "#FF00FF",
            borderBottomWidth: 0,
          }}
        >
          {/* Header */}
          <View
            className="flex-row items-center justify-between border-b border-gray-800 px-5 py-4"
          >
            <View className="flex-row items-center">
              <View className="mr-3 rounded-full bg-fuchsia-500/20 p-2">
                <Bot size={24} color="#FF00FF" />
              </View>
              <View>
                <Text className="text-lg font-black text-white">
                  {language === "el" ? "Βοηθός" : "Assistant"}
                </Text>
                <Text className="text-xs font-medium text-gray-400">
                  {language === "el" ? "Οδηγός αγορών" : "Buyer's guide"}
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleClose}
              className="rounded-full bg-gray-800 p-2"
              style={{ minHeight: 44, minWidth: 44, alignItems: "center", justifyContent: "center" }}
              accessibilityRole="button"
              accessibilityLabel={language === "el" ? "Κλείσιμο" : "Close"}
            >
              <X size={20} color="#FFF" />
            </Pressable>
          </View>

          {/* Messages */}
          <ScrollView
            ref={scrollViewRef}
            className="flex-1 px-4 py-4"
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {messages.length === 0 ? (
              <Animated.View entering={FadeIn.delay(200)} className="items-center py-8">
                <View className="mb-4 rounded-full bg-fuchsia-500/20 p-4">
                  <Sparkles size={32} color="#FF00FF" />
                </View>
                <Text className="mb-2 text-center text-lg font-bold text-white">
                  {language === "el"
                    ? "Γεια! Πώς μπορώ να βοηθήσω;"
                    : "Hi! How can I help you?"}
                </Text>
                <Text className="text-center text-sm text-gray-400">
                  {language === "el"
                    ? "Ρώτα με για τιμές, συσκευές ή ασφάλεια"
                    : "Ask me about pricing, devices, or safety"}
                </Text>
              </Animated.View>
            ) : (
              messages.map((message) => (
                <Animated.View
                  key={message.id}
                  entering={FadeIn}
                  className={`mb-4 max-w-[85%] ${
                    message.role === "user" ? "self-end" : "self-start"
                  }`}
                >
                  <View
                    className={`flex-row items-end ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <View
                      className={`rounded-full p-1.5 ${
                        message.role === "user"
                          ? "ml-2 bg-emerald-500/20"
                          : "mr-2 bg-fuchsia-500/20"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User size={16} color="#00FF88" />
                      ) : (
                        <Bot size={16} color="#FF00FF" />
                      )}
                    </View>
                    <View
                      className={`rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "rounded-br-sm bg-emerald-600"
                          : "rounded-bl-sm bg-gray-800"
                      }`}
                    >
                      <Text
                        className={`text-sm leading-5 ${
                          message.role === "user" ? "text-white" : "text-gray-200"
                        }`}
                      >
                        {message.content}
                      </Text>
                    </View>
                  </View>
                </Animated.View>
              ))
            )}

            {/* Loading indicator */}
            {sendMessageMutation.isPending && (
              <Animated.View
                entering={FadeIn}
                className="mb-4 max-w-[85%] self-start"
              >
                <View className="flex-row items-end">
                  <View className="mr-2 rounded-full bg-fuchsia-500/20 p-1.5">
                    <Bot size={16} color="#FF00FF" />
                  </View>
                  <View className="rounded-2xl rounded-bl-sm bg-gray-800 px-4 py-3">
                    <Text className="text-sm text-gray-400">
                      {language === "el" ? "Σκέφτομαι..." : "Thinking..."}
                    </Text>
                  </View>
                </View>
              </Animated.View>
            )}

            {/* Suggestions */}
            {suggestions.length > 0 && !sendMessageMutation.isPending && (
              <Animated.View entering={FadeIn.delay(300)} className="mb-4">
                <Text className="mb-2 text-xs font-bold uppercase text-gray-500">
                  {language === "el" ? "Προτάσεις" : "Suggestions"}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {suggestions.map((suggestion, index) => (
                    <Pressable
                      key={index}
                      onPress={() => handleSuggestionPress(suggestion)}
                      className="rounded-full bg-gray-800 px-4 py-2"
                      style={{ borderWidth: 1, borderColor: "#333" }}
                    >
                      <Text className="text-sm font-medium text-gray-300">
                        {suggestion}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </Animated.View>
            )}
          </ScrollView>

          {/* Input */}
          <View className="border-t border-gray-800 px-4 py-3">
            <View
              className="flex-row items-center rounded-2xl bg-gray-800 px-4"
              style={{ borderWidth: 1, borderColor: "#333" }}
            >
              <TextInput
                className="flex-1 py-3 text-base text-white"
                placeholder={language === "el" ? "Γράψε μήνυμα..." : "Type a message..."}
                placeholderTextColor="#666"
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={500}
                returnKeyType="send"
                onSubmitEditing={handleSend}
                blurOnSubmit={false}
              />
              <Pressable
                onPress={handleSend}
                disabled={!inputText.trim() || sendMessageMutation.isPending}
                className="ml-2 rounded-full p-2"
                style={{
                  backgroundColor:
                    inputText.trim() && !sendMessageMutation.isPending
                      ? "#FF00FF"
                      : "#333",
                  minHeight: 40,
                  minWidth: 40,
                  alignItems: "center",
                  justifyContent: "center",
                }}
                accessibilityRole="button"
                accessibilityLabel={language === "el" ? "Αποστολή" : "Send"}
              >
                <Send
                  size={18}
                  color={inputText.trim() && !sendMessageMutation.isPending ? "#FFF" : "#666"}
                />
              </Pressable>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

export default AssistantChat;
