import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { OverdueCider } from '../../../types/analytics';

interface Props {
  overdue: OverdueCider[];
}

const INITIAL_SHOWN = 3;

function OverdueRow({ item }: { item: OverdueCider }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowName}>{item.cider.name}</Text>
      <Text style={styles.rowBrand}>{item.cider.brand}</Text>
      <View style={styles.rowMeta}>
        <Text style={styles.rowMetaText}>
          Avg: {item.avgRating.toFixed(1)}/10 ({item.experienceCount} tries)
        </Text>
        <Text style={styles.rowMetaText}>
          Last tried: {item.monthsSinceLastTried} month{item.monthsSinceLastTried === 1 ? '' : 's'} ago
        </Text>
      </View>
    </View>
  );
}

export default function OverdueCidersCard({ overdue }: Props) {
  const [showAll, setShowAll] = useState(false);

  if (overdue.length === 0) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Haven't Had in a While</Text>
        <Text style={styles.emptyText}>All your favourites have been recently enjoyed.</Text>
      </View>
    );
  }

  const shown = overdue.slice(0, INITIAL_SHOWN);
  const canExpand = overdue.length > INITIAL_SHOWN;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Haven't Had in a While</Text>
      {shown.map((item, idx) => (
        <React.Fragment key={item.cider.id}>
          <OverdueRow item={item} />
          {idx < shown.length - 1 && <View style={styles.separator} />}
        </React.Fragment>
      ))}
      {canExpand && (
        <TouchableOpacity onPress={() => setShowAll(true)} style={styles.showAll}>
          <Text style={styles.showAllText}>Show all ({overdue.length})</Text>
        </TouchableOpacity>
      )}

      <Modal
        visible={showAll}
        transparent
        animationType="slide"
        onRequestClose={() => setShowAll(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Haven't Had in a While</Text>
              <TouchableOpacity onPress={() => setShowAll(false)}>
                <Text style={styles.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={overdue}
              keyExtractor={item => item.cider.id}
              renderItem={({ item }) => <OverdueRow item={item} />}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
  },
  row: {
    paddingVertical: 8,
  },
  rowName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  rowBrand: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  rowMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  rowMetaText: {
    fontSize: 12,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 4,
  },
  showAll: {
    marginTop: 12,
    alignItems: 'center',
  },
  showAllText: {
    fontSize: 13,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  modalClose: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
});
