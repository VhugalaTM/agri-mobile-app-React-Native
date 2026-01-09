// OTP file 
import { View, Text, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, Platform } from 'react-native'
import React, { useEffect, useState, useContext } from 'react'
import { AuthContext } from '../AuthContext'
import { useNavigation } from '@react-navigation/native'
//import { signInWithPhoneNumber } from 'firebase/auth'
import { auth } from '../../../firebase-config/config';
import {
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';

import { 
  signInWithPhoneNumber, 
  RecaptchaVerifier,
  onAuthStateChanged,
  signOut 
} from 'firebase/auth';

const Otp = () => {
  // AUTH CONTEXT LOGIC
  const { setIsLogin } = useContext(AuthContext);
  
  // ACCESS THE NAVIGATION COMPONENT 
  const navigation = useNavigation();

  // State management
  const [user, setUser] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Setup recaptcha verifier
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
          'callback': () => {
            console.log('reCAPTCHA solved');
          },
        });
      }
    } catch (err) {
      console.log('Recaptcha setup warning:', err);
    }
  }, []);
  
  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (userData) => {
      setUser(userData);
      console.log('User auth state changed:', userData);
    });
    return unsubscribe;
  }, []);

  // Countdown timer for resend OTP
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // Helper functions
  const formatPhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';
    
    let cleaned = phoneNumber.replace(/\D/g, '');
    
    if (!cleaned.startsWith('+')) {
      cleaned = `+27${cleaned}`; // Default to India
    }
    
    return cleaned;
  };

    const getErrorMessage = (errorCode) => {
    const errorMessages = {
      'auth/invalid-phone-number': 'Invalid phone number format',
      'auth/too-many-requests': 'Too many attempts. Please try again later',
      'auth/invalid-verification-code': 'Invalid OTP code',
      'auth/captcha-check-failed': 'Verification failed. Please try again',
      'auth/quota-exceeded': 'SMS quota exceeded. Try again later',
      'auth/user-disabled': 'This account has been disabled',
      'auth/session-expired': 'OTP expired. Please request a new code',
    };
    
    return errorMessages[errorCode] || 'An error occurred. Please try again.';
  };

  // Send OTP
  const sendOTP = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Error', 'Please enter a phone number');
      return;
    }

    // Basic phone number validation
    if (phoneNumber.replace(/\D/g, '').length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      
      let recaptchaVerifier;
      
      // Try different approaches for recaptcha
      if (window.recaptchaVerifier) {
        recaptchaVerifier = window.recaptchaVerifier;
      } else {
        // Fallback recaptcha setup
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);
      setConfirm(confirmation);
      setCountdown(60);
      Alert.alert('OTP Sent', 'Verification code has been sent to your phone');
    } catch (err) {
      console.log('OTP Send Error:', err);
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg);
      Alert.alert('Error', errorMsg || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

    // Verify OTP
  const verifyOTP = async () => {
    if (!otpCode.trim() || otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit OTP code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      if (!confirm) {
        throw new Error('No confirmation available. Please request a new OTP.');
      }

      await confirm.confirm(otpCode);
      setConfirm(null);
      setOtpCode('');
      Alert.alert('Success', 'Phone number verified successfully!');
      // User is now logged in - you can navigate to another screen here
    } catch (err) {
      console.log('OTP Verify Error:', err);
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg);
      Alert.alert('Error', errorMsg || 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

    // Resend OTP
  const resendOTP = async () => {
    if (countdown > 0) return;

    setLoading(true);
    setError('');
    
    try {
      const formattedNumber = formatPhoneNumber(phoneNumber);
      
      let recaptchaVerifier = window.recaptchaVerifier;
      if (!recaptchaVerifier) {
        recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          'size': 'invisible',
        });
      }

      const confirmation = await signInWithPhoneNumber(auth, formattedNumber, recaptchaVerifier);
      setConfirm(confirmation);
      setCountdown(60);
      Alert.alert('OTP Resent', 'New verification code has been sent');
    } catch (err) {
      console.log('Resend OTP Error:', err);
      const errorMsg = getErrorMessage(err.code);
      setError(errorMsg);
      Alert.alert('Error', errorMsg || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

    // Sign out
  const signOutUser = async () => {
    try {
      await signOut(auth);
      setConfirm(null);
      setError('');
      setPhoneNumber('');
      setOtpCode('');
      Alert.alert('Signed Out', 'You have been signed out successfully');
    } catch (err) {
      setError('Error signing out');
    }
  };

    const formatPhoneDisplay = (number) => {
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length <= 3) return cleaned;
    if (cleaned.length <= 6) return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 10)}`;
  };

  // If user is already logged in, show welcome screen
  if (user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome! ✅</Text>
          <Text style={styles.subtitle}>
            You are successfully verified
          </Text>
          
          <View style={styles.userInfo}>
            <Text style={styles.infoLabel}>Phone Number:</Text>
            <Text style={styles.infoValue}>{user.phoneNumber}</Text>
          </View>

          <TouchableOpacity style={styles.signOutButton} onPress={signOutUser}>
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Phone Verification</Text>
        <Text style={styles.subtitle}>
          {confirm 
            ? 'Enter the 6-digit code sent to your phone' 
            : 'Enter your phone number to get started'
            
          }
        </Text>
        
        {error ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          {!confirm ? (
            // Phone Number Input
            <>
              <Text style={styles.label}>Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="9876543210"
                  value={formatPhoneDisplay(phoneNumber)}
                  onChangeText={(text) => setPhoneNumber(text.replace(/\D/g, ''))}
                  keyboardType="phone-pad"
                  maxLength={10}
                  autoComplete="tel"
                  placeholderTextColor="#999"
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.button,
                  (phoneNumber.replace(/\D/g, '').length < 10 || loading) && styles.buttonDisabled
                ]}
                onPress={sendOTP}
                disabled={phoneNumber.replace(/\D/g, '').length < 10 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send Verification Code</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            // OTP Verification
            <>
              <View style={styles.phoneInfo}>
                <Text style={styles.phoneLabel}>Verifying number:</Text>
                <Text style={styles.phoneNumber}>+27 {formatPhoneDisplay(phoneNumber)}</Text>
              </View>

              <Text style={styles.label}>Enter Verification Code</Text>
              <TextInput
                style={styles.otpInput}
                placeholder="123456"
                value={otpCode}
                onChangeText={setOtpCode}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                autoFocus
                placeholderTextColor="#999"
              />

              <TouchableOpacity
                style={[
                  styles.button,
                  (otpCode.length !== 6 || loading) && styles.buttonDisabled
                ]}
                onPress={verifyOTP}
                disabled={otpCode.length !== 6 || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify & Continue</Text>
                )}
              </TouchableOpacity>

              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>
                  Didn't receive the code?{' '}
                </Text>
                <TouchableOpacity
                  onPress={resendOTP}
                  disabled={countdown > 0 || loading}
                >
                  <Text style={[
                    styles.resendButton,
                    (countdown > 0 || loading) && styles.resendButtonDisabled
                  ]}>
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Code'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>

        {/* Hidden recaptcha container */}
        <View style={styles.hiddenContainer} id="recaptcha-container" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    color: '#666',
    lineHeight: 22,
  },
  card: {
    backgroundColor: '#ffffff',
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#1a1a1a',
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
  },
  countryCode: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    borderRightWidth: 1,
    borderRightColor: '#ddd',
  },
  phoneInput: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    color: '#333',
  },
  phoneInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  phoneLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  phoneNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  otpInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 24,
    backgroundColor: '#f8f9fa',
    letterSpacing: 8,
    color: '#1a1a1a',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  resendText: {
    fontSize: 14,
    color: '#666',
  },
  resendButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  resendButtonDisabled: {
    color: '#ccc',
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#f44336',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    lineHeight: 18,
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
    lineHeight: 16,
  },
  hiddenContainer: {
    display: 'none',
  },
  userInfo: {
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  signOutButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default Otp;