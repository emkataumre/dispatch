import { forwardRef, useImperativeHandle, useRef, useMemo, useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native'
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet'
import { supabase } from '@/lib/supabase'
import { submitRating } from '@/lib/ratings'

export type PoiRatingModalHandle = {
  present: () => void
  dismiss: () => void
}

type Props = {
  poiId: string
  onSubmitted: () => void
}

const STAR_LABELS = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent']

export const PoiRatingModal = forwardRef<PoiRatingModalHandle, Props>(function PoiRatingModal(
  { poiId, onSubmitted },
  ref
) {
  const modalRef = useRef<BottomSheetModal>(null)
  const snapPoints = useMemo(() => ['55%'], [])

  const [selectedRating, setSelectedRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useImperativeHandle(ref, () => ({
    present: () => {
      setSelectedRating(null)
      setComment('')
      setError(null)
      modalRef.current?.present()
    },
    dismiss: () => modalRef.current?.dismiss(),
  }))

  const handleSubmit = async () => {
    if (!selectedRating) return
    setSubmitting(true)
    setError(null)
    try {
      await submitRating(supabase, {
        poiId,
        rating: selectedRating,
        comment,
      })
      onSubmitted()
      modalRef.current?.dismiss()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const isReady = !!selectedRating && !submitting

  return (
    <BottomSheetModal
      ref={modalRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      handleIndicatorStyle={styles.handleIndicator}
      backgroundStyle={styles.modalBackground}
    >
      <BottomSheetView style={styles.container}>
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={styles.title}>Leave a Review</Text>
          <Text style={styles.subtitle}>How was your experience?</Text>
        </View>

        {/* Star rating picker */}
        <View style={styles.starsSection}>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelectedRating(i)}
                hitSlop={6}
                activeOpacity={0.7}
                style={styles.starButton}
              >
                <Text
                  style={[
                    styles.star,
                    selectedRating !== null && i <= selectedRating
                      ? styles.starActive
                      : styles.starInactive,
                  ]}
                >
                  {selectedRating !== null && i <= selectedRating ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.starLabel}>
            {selectedRating ? STAR_LABELS[selectedRating] : 'Tap to rate'}
          </Text>
        </View>

        {/* Comment input */}
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder="Share what you loved (or didn't)…"
            placeholderTextColor="#C0BDB8"
            multiline
            maxLength={280}
            value={comment}
            onChangeText={setComment}
          />
          <Text style={styles.charCount}>{comment.length}/280</Text>
        </View>

        {/* Error */}
        {error ? (
          <View style={styles.errorRow}>
            <Text style={styles.errorIcon}>⚠</Text>
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            isReady ? styles.submitActive : styles.submitDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isReady}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Text style={styles.submitText}>
                {isReady ? 'Submit Review' : 'Select a rating first'}
              </Text>
              {isReady && <Text style={styles.submitArrow}>→</Text>}
            </>
          )}
        </TouchableOpacity>
      </BottomSheetView>
    </BottomSheetModal>
  )
})

const styles = StyleSheet.create({
  modalBackground: {
    backgroundColor: '#FAFAF8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    width: 36,
    height: 4,
    backgroundColor: '#D4D4CF',
    borderRadius: 2,
  },
  container: {
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 32,
    gap: 18,
  },
  headerRow: {
    gap: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#131313',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: '#AAAAAA',
    fontWeight: '400',
  },
  starsSection: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  starButton: {
    padding: 4,
  },
  star: {
    fontSize: 44,
  },
  starActive: {
    color: '#F5A623',
  },
  starInactive: {
    color: '#DDD9D3',
  },
  starLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#AAAAAA',
    letterSpacing: 0.3,
    minHeight: 18,
  },
  inputWrapper: {
    position: 'relative',
  },
  input: {
    borderWidth: 1.5,
    borderColor: '#EDECEA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingTop: 13,
    paddingBottom: 32,
    fontSize: 15,
    color: '#131313',
    minHeight: 90,
    textAlignVertical: 'top',
    backgroundColor: '#fff',
    lineHeight: 22,
  },
  charCount: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 11,
    color: '#CCCCCC',
    fontWeight: '500',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF1F1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  errorIcon: {
    fontSize: 13,
    color: '#E51E1E',
  },
  error: {
    color: '#E51E1E',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    gap: 8,
  },
  submitActive: {
    backgroundColor: '#131313',
  },
  submitDisabled: {
    backgroundColor: '#EDECEA',
  },
  submitText: {
    fontWeight: '700',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 0.1,
  },
  submitArrow: {
    color: '#ffffff90',
    fontSize: 16,
    fontWeight: '600',
  },
})
