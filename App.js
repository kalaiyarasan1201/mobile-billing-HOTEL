import React from 'react';
import { LogBox, View, Platform, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';

import BillingScreen from './src/screens/BillingScreen';
import ProductsScreen from './src/screens/ProductsScreen';
import PrinterSetupScreen from './src/screens/PrinterSetupScreen';
import HistorySalesScreen from './src/screens/HistorySalesScreen';
import Colors from './src/constants/Colors';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';

LogBox.ignoreLogs(['props.pointerEvents is deprecated']);

const Tab = createBottomTabNavigator();

const AppNavigation = () => {
  const { t } = useLanguage();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            if (route.name === 'Billing') {
              return <FontAwesome5 name="receipt" size={size} color={color} />;
            } else if (route.name === 'Products') {
              return <MaterialCommunityIcons name="food" size={size} color={color} />;
            } else if (route.name === 'Printer Setup') {
              return <FontAwesome5 name="print" size={size} color={color} />;
            } else if (route.name === 'History & Sales') {
              return <FontAwesome5 name="wallet" size={size} color={color} />;
            }
          },
          tabBarActiveTintColor: Colors.primary,
          tabBarInactiveTintColor: 'gray',
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        })}
      >
        <Tab.Screen name="Billing" component={BillingScreen} options={{ title: t('billingTab'), headerShown: false }} />
        <Tab.Screen name="Products" component={ProductsScreen} options={{ title: t('productsTab') }} />
        <Tab.Screen name="Printer Setup" component={PrinterSetupScreen} options={{ title: t('printerTab') }} />
        <Tab.Screen name="History & Sales" component={HistorySalesScreen} options={{ title: t('historyTab') }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const isWeb = Platform.OS === 'web';

  return (
    <View style={isWeb ? styles.webContainer : styles.mobileContainer}>
      <View style={isWeb ? styles.appWrapper : styles.mobileContainer}>
        <SafeAreaProvider>
          <LanguageProvider>
            <AppNavigation />
          </LanguageProvider>
        </SafeAreaProvider>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  mobileContainer: { flex: 1 },
  webContainer: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appWrapper: {
    width: '100%',
    maxWidth: 420,
    height: '100%',
    maxHeight: 850,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  }
});
