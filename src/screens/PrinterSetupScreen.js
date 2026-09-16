import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getSettings, saveSettings } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';

export default function PrinterSetupScreen() {
  const [settings, setSettings] = useState({
    shopName: '', tagline: '', address: '', phone: ''
  });
  const [isScanning, setIsScanning] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  
  const { t } = useLanguage();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadSettings();
    }
  }, [isFocused]);

  const loadSettings = async () => {
    const data = await getSettings();
    if (data) setSettings(data);
  };

  const handleSave = async () => {
    await saveSettings(settings);
    alert('Settings Saved Successfully!');
  };

  const handleTestPrint = () => {
    if (!isConnected) {
      alert('Please connect a printer first!');
      return;
    }
    alert('Test receipt printed successfully! (Simulated)');
  };

  const handleScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
    }, 2000);
  };

  const toggleConnection = () => {
    setIsConnected(!isConnected);
    if (!isConnected) alert('Simulated Bluetooth Printer Connected!');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('bluetoothPrinterSetup')}</Text>
      </View>
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity style={styles.statusCard} onPress={toggleConnection}>
          <View style={[styles.bluetoothIcon, isConnected && { backgroundColor: '#4CAF50' }]}>
            <FontAwesome5 name="bluetooth-b" size={20} color="#fff" />
          </View>
          <View style={styles.statusTextContainer}>
            {isConnected ? (
              <>
                <Text style={[styles.statusTitle, { color: '#4CAF50' }]}>{t('connected')} <FontAwesome5 name="check-circle" size={16} color="#4CAF50" /></Text>
                <Text style={styles.statusSubtitle}>Thermal Printer (58mm)</Text>
              </>
            ) : (
              <>
                <Text style={styles.statusTitle}>{t('notConnected')} <FontAwesome5 name="times" size={16} color={Colors.dangerText} /></Text>
                <Text style={styles.statusSubtitle}>{t('tapToConnect')}</Text>
              </>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.testPrintBtn} onPress={handleTestPrint}>
          <FontAwesome5 name="print" size={16} color="#fff" style={{marginRight: 10}} />
          <Text style={styles.testPrintText}>{t('sendTestPrint')}</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('pairedPrinters')}</Text>
          <TouchableOpacity onPress={handleScan}>
            <FontAwesome5 name={isScanning ? "spinner" : "sync-alt"} size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        
        {isScanning ? (
          <Text style={styles.infoText}>{t('scanning')}</Text>
        ) : (
          <Text style={styles.infoText}>{t('makeSureBluetooth')}</Text>
        )}

        <View style={styles.sectionHeader}>
          <FontAwesome5 name="store" size={18} color={Colors.primary} style={{marginRight: 10}} />
          <Text style={styles.sectionTitle}>{t('receiptHeaderSettings')}</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('shopName')}</Text>
          <TextInput style={styles.input} value={settings.shopName} onChangeText={t => setSettings({...settings, shopName: t})} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('tagline')}</Text>
          <TextInput style={styles.input} value={settings.tagline} onChangeText={t => setSettings({...settings, tagline: t})} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('address')}</Text>
          <TextInput style={styles.input} value={settings.address} onChangeText={t => setSettings({...settings, address: t})} />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('phoneNumber')}</Text>
          <TextInput style={styles.input} value={settings.phone} onChangeText={t => setSettings({...settings, phone: t})} />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <FontAwesome5 name="save" size={16} color="#fff" style={{marginRight: 10}} />
          <Text style={styles.saveText}>{t('saveReceiptHeader')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.primary, padding: 15, paddingTop: 40 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    padding: 15,
    borderRadius: 12,
    marginBottom: 20
  },
  bluetoothIcon: {
    backgroundColor: Colors.primary,
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  statusTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.dangerText },
  statusSubtitle: { fontSize: 12, color: Colors.textLight, marginTop: 4 },
  testPrintBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    padding: 15, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 30
  },
  testPrintText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 15, marginTop: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, flex: 1 },
  infoText: { color: Colors.textLight, fontSize: 14, marginBottom: 30, lineHeight: 20 },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 12, color: Colors.textLight, marginBottom: 5, backgroundColor: '#fff', alignSelf: 'flex-start', paddingHorizontal: 5, zIndex: 1, marginLeft: 10, position: 'relative', top: 10 },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 8, padding: 15, fontSize: 16, color: Colors.text, paddingTop: 15 },
  saveBtn: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    padding: 15, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 10,
    alignSelf: 'flex-end',
    width: 200
  },
  saveText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
});
