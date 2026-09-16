import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, TouchableOpacity, ScrollView, Modal, Alert, Platform, TextInput } from 'react-native';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '../constants/Colors';
import { getBills, clearBills, updateBills } from '../store/storage';
import { useIsFocused } from '@react-navigation/native';
import { useLanguage } from '../context/LanguageContext';
import DateTimePicker from '@react-native-community/datetimepicker';

const formatDateDDMMYY = (date) => {
  if (!date) return '';
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear().toString().slice(-2);
  return `${d}/${m}/${y}`;
};

export default function HistorySalesScreen() {
  const [bills, setBills] = useState([]);
  const [selectedFilter, setSelectedFilter] = useState('total'); // 'daily', 'monthly', 'yearly', 'total', 'custom'
  const [selectedBill, setSelectedBill] = useState(null);
  const [customDate, setCustomDate] = useState(new Date());
  const [tempCustomDate, setTempCustomDate] = useState(new Date());
  const [manualDateText, setManualDateText] = useState(formatDateDDMMYY(new Date()));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showCustomDateModal, setShowCustomDateModal] = useState(false);
  const { t } = useLanguage();
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      loadBills();
    }
  }, [isFocused]);

  const loadBills = async () => {
    const data = await getBills();
    setBills(data);
  };



  const now = new Date();
  const today = now.toLocaleDateString();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Dynamically detect local date format (DD/MM/YYYY vs MM/DD/YYYY)
  const testDateStr = new Date(2026, 0, 31).toLocaleDateString(); // Jan 31, 2026
  const parts31 = testDateStr.split(/[\/\-]/);
  let monthIndex = 0;
  let yearIndex = 2;
  
  if (parts31.length === 3) {
    if (parts31[0].includes('31')) {
       monthIndex = 1; yearIndex = 2; // DD/MM/YYYY
    } else if (parts31[1].includes('31')) {
       monthIndex = 0; yearIndex = 2; // MM/DD/YYYY
    } else if (parts31[2].includes('31')) {
       monthIndex = 1; yearIndex = 0; // YYYY/MM/DD
    }
  }

  let dailySales = 0;
  let monthlySales = 0;
  let yearlySales = 0;
  let totalSales = 0;
  let customSales = 0;

  const dailyBills = [];
  const monthlyBills = [];
  const yearlyBills = [];
  const customBillsArray = [];

  const customDateString = customDate.toLocaleDateString();

  bills.forEach(bill => {
    totalSales += bill.total;
    
    let billMonth = -1;
    let billYear = -1;
    
    if (bill.timestamp) {
      const d = new Date(bill.timestamp);
      billMonth = d.getMonth();
      billYear = d.getFullYear();
    } else if (bill.date) {
      const parts = bill.date.split(/[\/\-]/);
      if (parts.length === 3) {
        const m = parseInt(parts[monthIndex], 10);
        const y = parseInt(parts[yearIndex], 10);
        if (!isNaN(m) && !isNaN(y)) {
          billMonth = m - 1; // 0-indexed month
          billYear = y < 100 ? y + 2000 : y;
        }
      }
      
      // Fallback if split failed somehow
      if (billMonth === -1) {
        const billDateObj = new Date(bill.date);
        if (!isNaN(billDateObj.getTime())) {
          billMonth = billDateObj.getMonth();
          billYear = billDateObj.getFullYear();
        }
      }
    }
    
    const isToday = bill.date === today || (bill.timestamp && new Date(bill.timestamp).toLocaleDateString() === today);
    
    if (isToday && !bill.clearedDaily) {
      dailySales += bill.total;
      dailyBills.push(bill);
    }
    
    // We only push to monthly if it matches month and year
    if (billMonth === currentMonth && billYear === currentYear && !bill.clearedMonthly) {
      monthlySales += bill.total;
      monthlyBills.push(bill);
    }
    
    // We only push to yearly if it matches year
    if (billYear === currentYear && !bill.clearedYearly) {
      yearlySales += bill.total;
      yearlyBills.push(bill);
    }
    
    // Check for custom date
    const billDateStr = bill.timestamp ? new Date(bill.timestamp).toLocaleDateString() : bill.date;
    if (billDateStr === customDateString) {
      customSales += bill.total;
      customBillsArray.push(bill);
    }
  });

  let displayedBills = bills;
  let listHeaderTitle = `${t('allReceipts')} (${bills.length})`;
  
  if (selectedFilter === 'daily') {
    displayedBills = dailyBills;
    listHeaderTitle = `${t('todayReceipts')} (${dailyBills.length})`;
  } else if (selectedFilter === 'monthly') {
    displayedBills = monthlyBills;
    listHeaderTitle = `${t('thisMonthReceipts')} (${monthlyBills.length})`;
  } else if (selectedFilter === 'yearly') {
    displayedBills = yearlyBills;
    listHeaderTitle = `${t('thisYearReceipts')} (${yearlyBills.length})`;
  } else if (selectedFilter === 'custom') {
    displayedBills = customBillsArray;
    listHeaderTitle = `${customDateString} (${customBillsArray.length})`;
  }

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setTempCustomDate(selectedDate);
      setManualDateText(formatDateDDMMYY(selectedDate));
    }
  };

  const renderEmptyList = () => (
    <View style={styles.emptyContainer}>
      <FontAwesome5 name="receipt" size={60} color={Colors.border} />
      <Text style={styles.emptyText}>{t('noBillsFound')}</Text>
    </View>
  );

  const renderBillItem = ({ item }) => (
    <TouchableOpacity style={styles.billCard} onPress={() => setSelectedBill(item)}>
      <View style={styles.billIcon}>
        <FontAwesome5 name="receipt" size={20} color={Colors.primary} />
      </View>
      <View style={styles.billInfo}>
        <Text style={styles.billId}>{item.id}</Text>
        <Text style={styles.billDate}>{item.date} {item.time ? `- ${item.time}` : ''}</Text>
        {item.paymentMethod && (
          <Text style={{ fontSize: 11, color: Colors.primary, marginTop: 2, fontWeight: 'bold' }}>
            Mode: {item.paymentMethod}
          </Text>
        )}
      </View>
      <Text style={styles.billAmount}>₹{item.total}</Text>
    </TouchableOpacity>
  );

  const handleClearHistory = () => {
    let title = "Clear All History";
    let message = "Are you sure you want to delete all bills?";
    
    if (selectedFilter === 'daily') {
      title = "Clear Today's History";
      message = "Are you sure you want to delete today's bills?";
    } else if (selectedFilter === 'monthly') {
      title = "Clear This Month's History";
      message = "Are you sure you want to delete this month's bills?";
    } else if (selectedFilter === 'yearly') {
      title = "Clear This Year's History";
      message = "Are you sure you want to delete this year's bills?";
    }

    const executeDelete = async () => {
      if (selectedFilter === 'total') {
        await clearBills();
        setBills([]);
      } else {
        const displayedIds = displayedBills.map(b => b.id);
        const updatedBills = bills.map(b => {
          if (displayedIds.includes(b.id)) {
            if (selectedFilter === 'daily') return { ...b, clearedDaily: true };
            if (selectedFilter === 'monthly') return { ...b, clearedMonthly: true };
            if (selectedFilter === 'yearly') return { ...b, clearedYearly: true };
          }
          return b;
        });
        await updateBills(updatedBills);
        setBills(updatedBills);
      }
    };

    if (Platform.OS === 'web') {
      const confirmDelete = window.confirm(`${title}\n\n${message} This cannot be undone.`);
      if (confirmDelete) {
        executeDelete();
      }
    } else {
      Alert.alert(
        title,
        message + " This cannot be undone.",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: executeDelete
          }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('billHistoryAndSales')}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            style={[styles.headerActionBtn, { marginRight: 10 }]}
            onPress={() => {
              setTempCustomDate(customDate);
              setManualDateText(formatDateDDMMYY(customDate));
              setShowCustomDateModal(true);
            }}
          >
            <FontAwesome5 name="calendar-alt" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClearHistory} style={styles.headerActionBtn}>
            <FontAwesome5 name="trash" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.summaryContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#6C5CE7' }, selectedFilter === 'total' && styles.activeCard]}
            onPress={() => setSelectedFilter('total')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><MaterialCommunityIcons name="cash-multiple" size={18} color="#6C5CE7" /></View>
              <Text style={styles.summaryLabel}>{t('total')}</Text>
            </View>
            <Text style={styles.summaryValue}>₹{totalSales}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#FF7675' }, selectedFilter === 'daily' && styles.activeCard]}
            onPress={() => setSelectedFilter('daily')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar-day" size={16} color="#FF7675" /></View>
              <Text style={styles.summaryLabel}>{t('today')}</Text>
            </View>
            <Text style={styles.summaryValue}>₹{dailySales}</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#0984E3' }, selectedFilter === 'monthly' && styles.activeCard]}
            onPress={() => setSelectedFilter('monthly')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar-alt" size={16} color="#0984E3" /></View>
              <Text style={styles.summaryLabel}>{t('monthly')}</Text>
            </View>
            <Text style={styles.summaryValue}>₹{monthlySales}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.summaryCard, { backgroundColor: '#00B894' }, selectedFilter === 'yearly' && styles.activeCard]}
            onPress={() => setSelectedFilter('yearly')}
          >
            <View style={styles.cardTopRow}>
              <View style={styles.iconWrapper}><FontAwesome5 name="calendar" size={16} color="#00B894" /></View>
              <Text style={styles.summaryLabel}>{t('yearly')}</Text>
            </View>
            <Text style={styles.summaryValue}>₹{yearlySales}</Text>
          </TouchableOpacity>

        </ScrollView>
      </View>

      {showDatePicker && Platform.OS !== 'web' && (
        <DateTimePicker
          value={tempCustomDate}
          mode="date"
          display="default"
          onChange={onChangeDate}
        />
      )}

      <View style={styles.listHeaderRow}>
        <Text style={styles.listHeader}>{listHeaderTitle}</Text>
        {selectedFilter !== 'total' && (
          <TouchableOpacity onPress={() => setSelectedFilter('total')} style={styles.clearBtn}>
            <Text style={styles.clearFilterText}>{t('showAll')}</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={displayedBills}
        keyExtractor={item => item.id}
        renderItem={renderBillItem}
        ListEmptyComponent={renderEmptyList}
        contentContainerStyle={displayedBills.length === 0 ? styles.emptyListContent : styles.listContent}
        showsVerticalScrollIndicator={false}
      />
      <Modal visible={!!selectedBill} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('billDetails')} - {selectedBill?.id}</Text>
              <TouchableOpacity onPress={() => setSelectedBill(null)}>
                <FontAwesome5 name="times" size={20} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <View style={{ padding: 15 }}>
              <Text style={{ marginBottom: 10, color: Colors.textLight, fontSize: 13 }}>
                {t('date')}: {selectedBill?.date} {selectedBill?.time ? `| ${t('time')}: ${selectedBill?.time}` : ''}
              </Text>
              {selectedBill?.paymentMethod && (
                <Text style={{ marginBottom: 10, color: Colors.primary, fontSize: 13, fontWeight: 'bold' }}>
                  Payment Mode: {selectedBill.paymentMethod}
                </Text>
              )}
              <View style={styles.itemsHeader}>
                <Text style={[styles.itemTextBold, { flex: 2 }]}>{t('item')}</Text>
                <Text style={[styles.itemTextBold, { flex: 1, textAlign: 'center' }]}>{t('qty')}</Text>
                <Text style={[styles.itemTextBold, { flex: 1, textAlign: 'right' }]}>{t('amount')}</Text>
              </View>
              <ScrollView style={{ maxHeight: 300 }}>
                {selectedBill?.items?.map((item, index) => {
                   const itemQty = item.unit === 'gram' ? `${item.qty}g` : item.qty;
                   const itemTotal = item.unit === 'gram' ? (item.price / (item.stepQty || 50)) * item.qty : item.price * item.qty;
                   return (
                    <View key={index} style={styles.itemRow}>
                      <Text style={[styles.itemText, { flex: 2 }]} numberOfLines={1}>{t(item.name)}</Text>
                      <Text style={[styles.itemText, { flex: 1, textAlign: 'center' }]}>{itemQty}</Text>
                      <Text style={[styles.itemText, { flex: 1, textAlign: 'right' }]}>₹{itemTotal.toFixed(2)}</Text>
                    </View>
                   );
                })}
              </ScrollView>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>{t('grandTotal')}:</Text>
                <Text style={styles.totalAmount}>₹{selectedBill?.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showCustomDateModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '85%', maxWidth: 400, padding: 25, borderRadius: 16 }]}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: Colors.text }}>Select Date:</Text>
            
            <View 
              style={{
                flexDirection: 'row', 
                alignItems: 'center', 
                borderWidth: 1, 
                borderColor: '#E2E8F0', 
                borderRadius: 10, 
                padding: 15,
                marginBottom: 30
              }}
            >
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS === 'web') {
                    const input = document.getElementById('web-date-picker-modal');
                    if (input) input.showPicker();
                  } else {
                    setShowDatePicker(true);
                  }
                }}
                style={{ marginRight: 15, position: 'relative' }}
              >
                <FontAwesome5 name="calendar-alt" size={18} color={Colors.textLight} />
                {Platform.OS === 'web' && (
                  <input 
                    id="web-date-picker-modal"
                    type="date"
                    style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%', left: 0, top: 0, cursor: 'pointer' }}
                    value={tempCustomDate.toISOString().split('T')[0]}
                    onChange={(e) => {
                      if (e.target.value) {
                        const newD = new Date(e.target.value);
                        setTempCustomDate(newD);
                        setManualDateText(formatDateDDMMYY(newD));
                      }
                    }}
                  />
                )}
              </TouchableOpacity>
              
              <TextInput 
                style={{ fontSize: 16, color: Colors.text, flex: 1, padding: 0 }}
                value={manualDateText}
                onChangeText={setManualDateText}
                keyboardType="numbers-and-punctuation"
                placeholder="DD/MM/YY"
              />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5 }}>
              <TouchableOpacity onPress={() => setShowCustomDateModal(false)} style={{ padding: 10 }}>
                <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 18 }}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => {
                  let parsedDate = null;
                  const parts = manualDateText.split(/[\/\-]/);
                  if (parts.length === 3) {
                    let d = parseInt(parts[0], 10);
                    let m = parseInt(parts[1], 10);
                    let y = parseInt(parts[2], 10);
                    
                    if (!isNaN(m) && !isNaN(d) && !isNaN(y)) {
                       parsedDate = new Date(y < 100 ? y + 2000 : y, m - 1, d);
                    }
                  }

                  if (parsedDate && !isNaN(parsedDate.getTime())) {
                    setCustomDate(parsedDate);
                    setSelectedFilter('custom');
                    setShowCustomDateModal(false);
                  } else {
                    if (Platform.OS === 'web') {
                      window.alert("Invalid Date. Please use DD/MM/YY format.");
                    } else {
                      Alert.alert("Invalid Date", "Please use DD/MM/YY format.");
                    }
                  }
                }} 
                style={{ padding: 10 }}
              >
                <Text style={{ color: Colors.primary, fontWeight: 'bold', fontSize: 18 }}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7FB' },
  header: { backgroundColor: Colors.primary, padding: 15, paddingTop: 40, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, marginBottom: 15, elevation: 5, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerActionBtn: { padding: 8, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 8 },
  
  summaryContainer: { marginBottom: 10 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 10 },
  summaryCard: {
    width: 105,
    height: 85,
    padding: 10,
    marginRight: 10,
    borderRadius: 16,
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5
  },
  activeCard: {
    transform: [{ scale: 1.05 }],
    borderWidth: 2,
    borderColor: '#fff'
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  iconWrapper: { backgroundColor: '#fff', width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  summaryLabel: { fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: '#fff' },
  
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 15, marginTop: 10, marginBottom: 10 },
  listHeader: { fontSize: 16, color: '#2D3436', fontWeight: '800' },
  clearBtn: { backgroundColor: Colors.primaryLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 15 },
  clearFilterText: { fontSize: 11, color: Colors.primary, fontWeight: 'bold' },
  
  listContent: { paddingHorizontal: 15, paddingBottom: 30 },
  emptyListContent: { flex: 1, justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyText: { textAlign: 'center', color: Colors.textLight, marginTop: 20, fontSize: 14, lineHeight: 20 },
  
  billCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary
  },
  billIcon: { backgroundColor: '#FFF0E6', width: 35, height: 35, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  billInfo: { flex: 1 },
  billId: { fontWeight: '800', fontSize: 14, color: '#2D3436' },
  billDate: { fontSize: 11, color: '#636E72', marginTop: 2, fontWeight: '500' },
  billAmount: { fontWeight: '900', fontSize: 16, color: Colors.primary },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', elevation: 5, width: '100%', maxWidth: 400 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: '#f8f9fa' },
  modalTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  itemsHeader: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: 8, marginBottom: 8 },
  itemRow: { flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f2f6' },
  itemTextBold: { fontSize: 13, fontWeight: 'bold', color: Colors.text },
  itemText: { fontSize: 13, color: Colors.text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 2, borderTopColor: Colors.border },
  totalLabel: { fontSize: 16, fontWeight: 'bold', color: Colors.text },
  totalAmount: { fontSize: 18, fontWeight: '900', color: Colors.primary }
});
