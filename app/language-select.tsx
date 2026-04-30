import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Animated,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  SUPPORTED_LANGUAGES,
  LanguageCode,
  changeLanguage,
  getPersistedLanguage,
  getDeviceLanguage,
} from '@/lib/i18n';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_SELECTED_KEY = 'language_selection_done';

export default function LanguageSelectScreen() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState<LanguageCode>('en');
  const [animValues] = useState(() =>
    SUPPORTED_LANGUAGES.map(() => new Animated.Value(1))
  );

  useEffect(() => {
    (async () => {
      const persisted = await getPersistedLanguage();
      const initial = persisted ?? getDeviceLanguage();
      setSelected(initial);
      if (i18n.language !== initial) {
        await changeLanguage(initial);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelect = async (code: LanguageCode, index: number) => {
    console.log('[LanguageSelect] User selected language:', code);
    setSelected(code);
    Animated.sequence([
      Animated.timing(animValues[index], {
        toValue: 0.96,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(animValues[index], {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
    await changeLanguage(code);
  };

  const handleContinue = async () => {
    console.log('[LanguageSelect] User tapped Continue — language:', selected, 'from:', from);
    await changeLanguage(selected);
    await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, 'true');
    if (from === 'settings') {
      router.back();
    } else {
      router.replace('/onboarding');
    }
  };

  const selectTitle = t('language.selectTitle');
  const selectSubtitle = t('language.selectSubtitle');
  const continueButtonLabel = t('language.continueButton');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      <View style={styles.header}>
        <Text style={styles.appName}>APS</Text>
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.title}>{selectTitle}</Text>
        <Text style={styles.subtitle}>{selectSubtitle}</Text>
      </View>

      <View style={styles.optionsList}>
        {SUPPORTED_LANGUAGES.map((lang, index) => {
          const isSelected = selected === lang.code;
          const showEnglishLabel = lang.nativeLabel !== lang.label;
          return (
            <Animated.View
              key={lang.code}
              style={{ transform: [{ scale: animValues[index] }] }}
            >
              <TouchableOpacity
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => handleSelect(lang.code, index)}
                activeOpacity={0.85}
              >
                <View style={styles.optionText}>
                  <Text style={[styles.nativeLabel, isSelected && styles.nativeLabelSelected]}>
                    {lang.nativeLabel}
                  </Text>
                  {showEnglishLabel && (
                    <Text style={styles.englishLabel}>{lang.label}</Text>
                  )}
                </View>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue} activeOpacity={0.85}>
          <Text style={styles.continueText}>{continueButtonLabel}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    paddingHorizontal: 24,
  },
  header: {
    paddingTop: 24,
    paddingBottom: 8,
    alignItems: 'center',
  },
  appName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
  titleBlock: {
    marginTop: 32,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.45)',
    lineHeight: 22,
  },
  optionsList: {
    flex: 1,
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  optionRowSelected: {
    borderColor: '#00D4AA',
    backgroundColor: 'rgba(0,212,170,0.08)',
  },
  optionText: {
    flex: 1,
  },
  nativeLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  nativeLabelSelected: {
    color: '#FFFFFF',
  },
  englishLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.35)',
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: '#00D4AA',
    borderColor: '#00D4AA',
  },
  checkMark: {
    fontSize: 13,
    fontWeight: '700',
    color: '#000000',
  },
  footer: {
    paddingBottom: 32,
    paddingTop: 16,
  },
  continueButton: {
    backgroundColor: '#00D4AA',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  continueText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.2,
  },
});
