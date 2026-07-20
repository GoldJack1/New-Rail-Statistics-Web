import { describe, expect, it } from 'vitest'

import { buildHelplineDisplay, buildLuggagePropertyDisplay, buildNationalKeyToiletsDisplay, combineStepFreeNotes, condenseKnowledgebaseDayList, dedupeKbHoursLines, extractHelplineUrlLines, extractStepFreeCategoryFromText, formatHelplineNoteText, formatKbLocationDisplayText, hasStructuredFirstClassLoungeSections, isGenericNationalRailHomepage, isHelplineBoilerplateNote, isHelplineContactHeadline, isHelplineYesNoNote, isKbPhoneLine, isKbPlaceholderLine, isKbUrlLine, mergeSameScheduleHoursLines, normalizeKbHoursLine, normalizeKbLocationText, parseFirstClassLoungeSections, partitionHelplineNotes, partitionHelplineText, sanitizeKbDisplayText, splitStepFreeCategoryFromNotes, splitStepFreeCategoryFromStepFreeAccess, splitToiletsLocationItems, stripHiddenKbFieldUrls } from './knowledgebaseDisplayText'

describe('sanitizeKbDisplayText', () => {
  it('removes Click here for details boilerplate with optional parentheses', () => {
    expect(sanitizeKbDisplayText('(Click here for details)')).toBe('')
    expect(sanitizeKbDisplayText('Click here for details')).toBe('')
    expect(sanitizeKbDisplayText('Click here for details.')).toBe('')
    expect(sanitizeKbDisplayText('More information (Click here for details).')).toBe('More information.')
    expect(
      sanitizeKbDisplayText(
        'Please call 0343 222 1234 (Service and network charges may apply. Click here for details)'
      )
    ).toBe('Please call 0343 222 1234 (Service and network charges may apply.)')
  })

  it('removes in a printable format here boilerplate and keeps the full stop', () => {
    expect(sanitizeKbDisplayText('in a printable format here.')).toBe('')
    expect(sanitizeKbDisplayText('in a printable format here')).toBe('')
    expect(
      sanitizeKbDisplayText(
        'Information to plan your onward journey is available in a printable format here.'
      )
    ).toBe('Information to plan your onward journey is available.')
    expect(
      sanitizeKbDisplayText(
        'Journey information (in a printable format here).'
      )
    ).toBe('Journey information.')
  })

  it('adds spacing around ampersands between letters and numbers', () => {
    expect(sanitizeKbDisplayText('Platforms 2&3 and 4.')).toBe('Platforms 2 & 3 and 4.')
    expect(sanitizeKbDisplayText('Between platforms 2 &3 and 4')).toBe('Between platforms 2 & 3 and 4')
    expect(sanitizeKbDisplayText('A&B')).toBe('A & B')
  })

  it('capitalises CCTV in note text', () => {
    expect(sanitizeKbDisplayText('Shelter has cctv monitoring.')).toBe('Shelter has CCTV monitoring.')
    expect(sanitizeKbDisplayText('Cctv in operation')).toBe('CCTV in operation')
  })

  it('moves helpline boilerplate out of the main value and strips please click here', () => {
    const passengerAssist =
      'We want everyone to travel with confidence. That is why, if you are planning on travelling on national rail services, you can request an assistance booking in advance - now up to 2 hours before your journey is due to start, any time of the day. For more information about Passenger Assist and how to request an assistance booking via Passenger Assist, please click here.'
    const turnUpAndGo =
      'We operate Turn Up and Go and pre-booked assistance at this station. Please speak to a member of staff for any assistance.'

    expect(isHelplineBoilerplateNote(passengerAssist)).toBe(true)
    expect(isHelplineBoilerplateNote(turnUpAndGo)).toBe(true)
    expect(partitionHelplineText(`0800 123 456\n${passengerAssist}\n${turnUpAndGo}`)).toEqual({
      main: '0800 123 456',
      notes: [
        'We want everyone to travel with confidence. That is why, if you are planning on travelling on national rail services, you can request an assistance booking in advance - now up to 2 hours before your journey is due to start, any time of the day. For more information about Passenger Assist and how to request an assistance booking via Passenger Assist.',
        turnUpAndGo,
      ],
    })
    expect(sanitizeKbDisplayText(`${passengerAssist}`)).toBe(
      'We want everyone to travel with confidence. That is why, if you are planning on travelling on national rail services, you can request an assistance booking in advance - now up to 2 hours before your journey is due to start, any time of the day. For more information about Passenger Assist and how to request an assistance booking via Passenger Assist.'
    )
  })

  it('detects helpline yes/no notes and url lines', () => {
    expect(isHelplineYesNoNote('Yes - from help point')).toBe(true)
    expect(isHelplineYesNoNote('Yes - from ticket office')).toBe(true)
    expect(isHelplineYesNoNote('• Yes - from help point')).toBe(true)
    expect(isHelplineYesNoNote('No')).toBe(true)
    expect(isKbUrlLine('https://www.nationalrail.co.uk/')).toBe(true)
    expect(isKbUrlLine('0800 123 456')).toBe(false)
    expect(partitionHelplineNotes(['• Yes - from help point\n• Yes - from ticket office'])).toEqual({
      yesNo: ['Yes - from help point', 'Yes - from ticket office'],
      other: [],
    })
    expect(isKbPlaceholderLine('—')).toBe(true)
    expect(extractHelplineUrlLines('Yes\nhttps://www.example.com/helpline')).toEqual([
      'https://www.example.com/helpline',
    ])
  })

  it('formats helpline phone numbers and URLs as Call / visit lines', () => {
    expect(isKbPhoneLine('0343 222 1234')).toBe(true)
    expect(formatHelplineNoteText('0343 222 1234\n\nhttps://www.nationalrail.co.uk/\n\nStaff are available.')).toBe(
      'Call 0343 222 1234 or visit https://www.nationalrail.co.uk/\n\nStaff are available.'
    )
    expect(
      isHelplineContactHeadline('Call 0343 222 1234 or visit https://www.nationalrail.co.uk/')
    ).toBe(true)
  })

  it('builds structured Aberdeen-style helpline display', () => {
    const passengerAssist =
      'We want everyone to travel with confidence. That is why, if you are planning on travelling on national rail services, you can request an assistance booking in advance - now up to 2 hours before your journey is due to start, any time of the day. For more information about Passenger Assist and how to request an assistance booking via Passenger Assist.'
    expect(
      buildHelplineDisplay({
        value: 'https://www.nationalrail.co.uk/',
        notes: [
          passengerAssist,
          'Tel: 0800 046 1634 and 18001 0800 046 1634 (Deaf and customers who are hard of hearing)',
          'Yes',
          'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday: 05:00–00:45',
          'Sunday: 08:45–00:45',
          'Meeting Point: At the Automatic Ticket Gates inside the station',
        ],
      })
    ).toEqual({
      value:
        'Call 0800 046 1634 and 18001 0800 046 1634 (Deaf and customers who are hard of hearing)',
      detailSections: [
        { label: 'Staff help', value: 'Yes' },
        { label: 'Meeting point', value: 'At the Automatic Ticket Gates inside the station' },
        {
          label: 'Hours',
          value: 'Monday to Saturday: 05:00–00:45\nSunday: 08:45–00:45',
        },
      ],
      notes: [],
    })
  })

  it('builds Abbey Wood-style helpline with staff availability note under Staff help', () => {
    expect(
      buildHelplineDisplay({
        value: '0343 222 1234\nhttps://www.nationalrail.co.uk/',
        notes: [
          'We want everyone to travel with confidence. That is why, if you are planning on travelling on national rail services, you can request an assistance booking in advance - now up to 2 hours before your journey is due to start, any time of the day. For more information about Passenger Assist and how to request an assistance booking via Passenger Assist, please click here.',
          'We operate Turn Up and Go and pre-booked assistance at this station. Please speak to a member of staff for any assistance.',
          'Yes',
          'Staff are available to assist from the first to last train.',
        ],
      })
    ).toEqual({
      value: 'Call 0343 222 1234',
      detailSections: [
        {
          label: 'Staff help',
          value: 'Yes\n\nStaff are available to assist from the first to last train.',
        },
      ],
      notes: [],
    })
  })

  it('keeps long TOC assisted-travel lists under Staff help (King’s Cross-style)', () => {
    expect(
      buildHelplineDisplay({
        value: 'Yes\n0800 022 3720',
        notes: [
          'If you wish to book assistance but are not sure which train operator you are travelling with, you can call 0800 022 3720. On calling, you will be referred to the appropriate train operator.',
          'Help is available at the Rail Information Point in the centre of the concourse, station help points or from any member of staff.',
          'Disability assistance is available to and from platforms, the car park and the taxi rank. You can request this from the Kings Cross Information Point in the centre of the Main Concourse, station help points or from any member of staff.',
          'Monday To Friday: 05:00–01:36',
          'Saturday: 05:00–00:36',
          'Sunday: 05:30–01:36',
        ],
      })
    ).toEqual({
      value: 'Call 0800 022 3720',
      detailSections: [
        {
          label: 'Staff help',
          value:
            'Yes\n\nHelp is available at the Rail Information Point in the centre of the concourse, station help points or from any member of staff.\n\nDisability assistance is available to and from platforms, the car park and the taxi rank. You can request this from the Kings Cross Information Point in the centre of the Main Concourse, station help points or from any member of staff.',
        },
        {
          label: 'Hours',
          value: 'Monday to Friday: 05:00–01:36\nSaturday: 05:00–00:36\nSunday: 05:30–01:36',
        },
      ],
      notes: [
        'If you wish to book assistance but are not sure which train operator you are travelling with, you can call 0800 022 3720. On calling, you will be referred to the appropriate train operator.',
      ],
    })
  })

  it('puts Journey Care TOC lists under Staff help (Leeds-style)', () => {
    expect(
      buildHelplineDisplay({
        value: 'https://www.nationalrail.co.uk/',
        notes: [
          'If you wish to book assistance but are not sure which train operator you are travelling with, you can call 0800 022 3720. On calling, you will be referred to the appropriate train operator.',
          'Journey Care assistance is available prior to travel via the relevant Train Operator:\n\nNorthern - 0800 138 5560 Customer services, Textphone 18001 03457 225 225\n\nLondon North Eastern Railway - 03457 225 225',
          'Monday To Sunday: 24 hours',
        ],
      })
    ).toEqual({
      value: 'Call 0800 022 3720',
      detailSections: [
        {
          label: 'Staff help',
          value:
            'Journey Care assistance is available prior to travel via the relevant Train Operator:\n\nNorthern - 0800 138 5560 Customer services, Textphone 18001 03457 225 225\n\nLondon North Eastern Railway - 03457 225 225',
        },
        { label: 'Hours', value: 'Monday to Sunday: 24 hours' },
      ],
      notes: [
        'If you wish to book assistance but are not sure which train operator you are travelling with, you can call 0800 022 3720. On calling, you will be referred to the appropriate train operator.',
      ],
    })
  })

  it('dedupes Cardiff-style annotation hours against structured Open hours', () => {
    expect(
      buildHelplineDisplay({
        value: '03333 211202\nMonday To Sunday: 08:00–20:00',
        notes: [
          'Monday to Friday 04:00 to 01:00',
          'Saturday 04:00 to 00:30',
          'Sunday 07:00 to 00:30',
          'Monday To Friday: 04:00–01:00',
          'Saturday: 04:00–00:30',
          'Sunday: 07:00–00:30',
        ],
      })
    ).toEqual({
      value: 'Call 03333 211202',
      detailSections: [
        {
          label: 'Hours',
          value:
            'Monday to Sunday: 08:00–20:00\nMonday to Friday: 04:00–01:00\nSaturday: 04:00–00:30\nSunday: 07:00–00:30',
        },
      ],
      notes: [],
    })
  })

  it('leaves unrelated text unchanged', () => {
    expect(sanitizeKbDisplayText('Coverage: Whole Station')).toBe('Coverage: Whole Station')
    expect(sanitizeKbDisplayText('For details: www.example.com')).toBe('For details: www.example.com')
  })

  it('hides the generic National Rail homepage on Lost Property and Left Luggage', () => {
    expect(isGenericNationalRailHomepage('https://www.nationalrail.co.uk/')).toBe(true)
    expect(isGenericNationalRailHomepage('https://www.nationalrail.co.uk/stations/leeds')).toBe(false)
    expect(
      stripHiddenKbFieldUrls('0113 350 3966\nhttps://www.nationalrail.co.uk/\nMonday To Sunday: 24 hours', 'LostProperty')
    ).toBe('0113 350 3966\nMonday To Sunday: 24 hours')
    expect(stripHiddenKbFieldUrls('No\nhttps://www.nationalrail.co.uk/', 'LeftLuggage')).toBe('No')
    expect(stripHiddenKbFieldUrls('https://www.nationalrail.co.uk/', 'LeftLuggage')).toBe('—')
    expect(stripHiddenKbFieldUrls('https://www.left-baggage.co.uk/index/locations', 'LeftLuggage')).toBe(
      'https://www.left-baggage.co.uk/index/locations'
    )
  })
})

describe('splitStepFreeCategoryFromNotes', () => {
  it('extracts Category A from a bullet list note and keeps the remaining bullets', () => {
    const { categoryValue, remainingNotes } = splitStepFreeCategoryFromNotes([
      '• Accessibility Category A. This station has step-free access to all platforms.\n• Staff ramp assistance is always available.',
    ])
    expect(categoryValue).toBe('A (This station has step-free access to all platforms.)')
    expect(remainingNotes).toEqual(['• Staff ramp assistance is always available.'])
  })

  it('extracts Category B2 from a leading paragraph and keeps later paragraphs', () => {
    const { categoryValue, remainingNotes } = splitStepFreeCategoryFromNotes([
      'This is a Category B2 station: Step-free access to both platforms via separate entrances. No step-free access between platforms.\n\nThe Assistance Meeting Point is by the steps, leading to platform 1.',
    ])
    expect(categoryValue).toBe(
      'B2 (Step-free access to both platforms via separate entrances. No step-free access between platforms.)'
    )
    expect(remainingNotes).toEqual(['The Assistance Meeting Point is by the steps, leading to platform 1.'])
  })

  it('extracts Category A when the station sentence ends with a full stop', () => {
    expect(
      splitStepFreeCategoryFromNotes([
        'This is a Category A station. This station has step-free access to all platforms. Tactile paving to all platforms',
      ])
    ).toEqual({
      categoryValue:
        'A (This station has step-free access to all platforms. Tactile paving to all platforms.)',
      remainingNotes: [],
    })
  })

  it('extracts category from StepFreeAccess main value when notes are empty', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value:
          'This is a Category A station. This station has step-free access to all platforms. Tactile paving to all platforms',
        notes: [],
      })
    ).toEqual({
      categoryValue:
        'A (This station has step-free access to all platforms. Tactile paving to all platforms.)',
      value: 'Yes',
      notes: [],
    })
  })

  it('shows Yes and one combined note when category A has remaining step-free notes', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole station',
        notes: [
          '• Accessibility Category A. This station has step-free access to all platforms.\n• Staff ramp assistance is always available.\n• Accessible seating is available in the ticket hall and platforms.\n• Wheelchairs available from first to last train.',
        ],
      })
    ).toEqual({
      categoryValue: 'A (This station has step-free access to all platforms.)',
      value: 'Yes',
      notes: [
        'Staff ramp assistance is always available.\n\nAccessible seating is available in the ticket hall and platforms.\n\nWheelchairs available from first to last train.',
      ],
    })
  })

  it('standardises Abbey Wood-style step-free bullets into Category A + Yes', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole Station',
        notes: [
          '• Accessibility Category A. This station has step-free access to all platforms.\n• Staff ramp assistance is always available.\n• Accessible seating is available in the ticket hall and platforms.\n• Wheelchairs available from first to last train.',
        ],
      })
    ).toEqual({
      categoryValue: 'A (This station has step-free access to all platforms.)',
      value: 'Yes',
      notes: [
        'Staff ramp assistance is always available.\n\nAccessible seating is available in the ticket hall and platforms.\n\nWheelchairs available from first to last train.',
      ],
    })
  })

  it('combines step-free note lines without bullet markers', () => {
    expect(
      combineStepFreeNotes([
        'Coverage: Whole station',
        '• Staff ramp assistance is always available.\n• Wheelchairs available from first to last train.',
      ])
    ).toEqual([
      'Staff ramp assistance is always available.\n\nWheelchairs available from first to last train.',
    ])
  })

  it('returns unchanged notes when no category line is present', () => {
    const notes = ['Partial step access via the side entrance only.']
    expect(splitStepFreeCategoryFromNotes(notes)).toEqual({
      categoryValue: null,
      remainingNotes: notes,
    })
  })

  it('infers Category A from Suitable for disabled passengers (Leeds-style)', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole Station',
        notes: ['Suitable for disabled passengers. Lifts or Level access to all platforms.'],
      })
    ).toEqual({
      categoryValue: 'A (Lifts or Level access to all platforms.)',
      value: 'Yes',
      notes: [],
    })
  })

  it('infers Category A from Suitable for disabled passengers and keeps later paragraphs (Euston-style)', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole Station',
        notes: [
          'Suitable for disabled passengers. Level access to all platforms via ramps. Lifts provided between concourse, taxi & car park and London Underground ticket hall.\n\nLift access is available to the Underground ticket hall, however the Underground station itself has only escalators & stairs.',
        ],
      })
    ).toEqual({
      categoryValue:
        'A (Level access to all platforms via ramps. Lifts provided between concourse, taxi & car park and London Underground ticket hall.)',
      value: 'Yes',
      notes: [
        'Lift access is available to the Underground ticket hall, however the Underground station itself has only escalators & stairs.',
      ],
    })
  })

  it('uses a default Category A description when Suitable for disabled passengers has no follow-on text', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole Station',
        notes: ['Suitable for disabled passengers.'],
      })
    ).toEqual({
      categoryValue: 'A (This station has step-free access to all platforms.)',
      value: 'Yes',
      notes: [],
    })
  })

  it('extracts Category A when the label and description are on separate lines (Aberystwyth-style)', () => {
    expect(
      splitStepFreeCategoryFromStepFreeAccess({
        value: 'Coverage: Whole station',
        notes: [
          'Category A.\n\nAccess to the station platform is possible via a short accessible ramp with handrails or four steps with handrails.',
        ],
      })
    ).toEqual({
      categoryValue:
        'A (Access to the station platform is possible via a short accessible ramp with handrails or four steps with handrails.)',
      value: 'Yes',
      notes: [],
    })
  })

  it('extracts step-free category formats used across the network', () => {
    expect(extractStepFreeCategoryFromText('Step Free Category A Station - This station has step free access to all platforms via lifts.')).toEqual({
      category: 'A',
      description: 'This station has step free access to all platforms via lifts.',
    })
    expect(extractStepFreeCategoryFromText('Step-free category B1 Station. Level access to both platforms from separate entrances.')).toEqual({
      category: 'B1',
      description: 'Level access to both platforms from separate entrances.',
    })
    expect(extractStepFreeCategoryFromText('Category A - This station has step-free access to all platforms / the platform')).toEqual({
      category: 'A',
      description: 'This station has step-free access to all platforms / the platform',
    })
    expect(
      extractStepFreeCategoryFromText(
        'This station has been classified as a step-free access category A station. This means that this station has step-free access to all platforms.'
      )
    ).toEqual({
      category: 'A',
      description: 'This means that this station has step-free access to all platforms.',
    })
    expect(extractStepFreeCategoryFromText('Category A Station Step free access to both platforms')).toEqual({
      category: 'A',
      description: 'Step free access to both platforms',
    })
  })
})

describe('normalizeKbLocationText', () => {
  it('preserves line breaks between bullet items', () => {
    expect(
      normalizeKbLocationText(
        '• On the paid side of the barrier.\n• Separate baby change facilities are also available.'
      )
    ).toBe('• On the paid side of the barrier.\n• Separate baby change facilities are also available.')
  })
})

describe('condenseKnowledgebaseDayList', () => {
  it('condenses Monday through Saturday into Monday to Saturday', () => {
    expect(
      condenseKnowledgebaseDayList([
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ])
    ).toBe('Monday to Saturday')
  })

  it('normalises Monday To Friday compound labels', () => {
    expect(condenseKnowledgebaseDayList(['Monday To Friday'])).toBe('Monday to Friday')
    expect(condenseKnowledgebaseDayList(['Monday To Sunday'])).toBe('Monday to Sunday')
  })
})

describe('normalizeKbHoursLine', () => {
  it('normalises freeform annotation hours and condensed day lists', () => {
    expect(normalizeKbHoursLine('Monday to Friday 04:00 to 01:00')).toBe(
      'Monday to Friday: 04:00–01:00'
    )
    expect(
      normalizeKbHoursLine(
        'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday: 06:30–22:00'
      )
    ).toBe('Monday to Saturday: 06:30–22:00')
  })

  it('dedupes equivalent structured and annotation hour lines', () => {
    expect(
      dedupeKbHoursLines([
        'Monday to Friday 04:00 to 01:00',
        'Monday To Friday: 04:00–01:00',
        'Saturday 04:00 to 00:30',
        'Saturday: 04:00–00:30',
      ])
    ).toEqual(['Monday to Friday: 04:00–01:00', 'Saturday: 04:00–00:30'])
  })
})

describe('mergeSameScheduleHoursLines', () => {
  it('merges separate 24-hour day blocks into Monday to Sunday', () => {
    expect(
      mergeSameScheduleHoursLines([
        'Monday to Friday: 24 hours',
        'Saturday: 24 hours',
        'Sunday: 24 hours',
      ])
    ).toEqual(['Monday to Sunday: 24 hours'])
  })
})

describe('buildLuggagePropertyDisplay', () => {
  it('formats Abbey Wood-style lost property with operator and details url', () => {
    expect(
      buildLuggagePropertyDisplay({
        available: 'Yes',
        operator: 'TfL Lost property',
        detailsUrl: 'https://tfl.gov.uk/help-and-contact/lost-property',
        extraLines: ['Yes', 'https://www.nationalrail.co.uk/', 'Operator Name: TfL Lost property'],
      })
    ).toEqual({
      value: 'Yes - Operated by: TfL Lost property',
      detailsUrl: 'https://tfl.gov.uk/help-and-contact/lost-property',
    })
  })

  it('formats Kings Cross-style left luggage with call, hours, and operator', () => {
    expect(
      buildLuggagePropertyDisplay({
        operator: 'Excess Baggage Company',
        phone: '020 3468 4690',
        hours: 'Monday to Friday: 07:00–23:00',
        detailsUrl: 'https://www.left-baggage.co.uk/index/locations',
        extraLines: [
          'https://www.left-baggage.co.uk/index/locations',
          '020 3468 4690',
          'Monday to Friday: 07:00–23:00',
          'Operator Name: Excess Baggage Company',
        ],
      })
    ).toEqual({
      value:
        'Operated by: Excess Baggage Company\nCall 020 3468 4690\nMonday to Friday: 07:00–23:00',
      detailsUrl: 'https://www.left-baggage.co.uk/index/locations',
    })
  })

  it('shows No for unavailable left luggage without dumping the NRE homepage', () => {
    expect(
      buildLuggagePropertyDisplay({
        available: 'No',
        detailsUrl: 'https://www.nationalrail.co.uk/',
        extraLines: ['No', 'https://www.nationalrail.co.uk/'],
      })
    ).toEqual({
      value: 'No',
      detailsUrl: null,
    })
  })

  it('ignores Aberdeen-style hours stuffed into OperatorName when unavailable', () => {
    expect(
      buildLuggagePropertyDisplay({
        available: 'No',
        operator: 'Monday - Saturday 07:30 - 21:30 & Sunday 09:00 - 21:00',
        detailsUrl: 'https://www.nationalrail.co.uk/',
        extraLines: [
          'No',
          'https://www.nationalrail.co.uk/',
          'Operator Name: Monday - Saturday 07:30 - 21:30 & Sunday 09:00 - 21:00',
        ],
      })
    ).toEqual({
      value: 'No',
      detailsUrl: null,
    })
  })

  it('treats hours-like OperatorName as hours when the facility is available', () => {
    expect(
      buildLuggagePropertyDisplay({
        available: 'Yes',
        operator: 'Monday - Saturday 07:30 - 21:30 & Sunday 09:00 - 21:00',
      })
    ).toEqual({
      value: 'Yes\nMonday to Saturday: 07:30–21:30\nSunday: 09:00–21:00',
      detailsUrl: null,
    })
  })
})

describe('formatKbLocationDisplayText', () => {
  it('removes bullet markers and separates items with paragraph breaks', () => {
    expect(
      formatKbLocationDisplayText(
        '• On the paid side of the barrier.\n• Separate baby change facilities are also available.'
      )
    ).toBe(
      'On the paid side of the barrier.\n\nSeparate baby change facilities are also available.'
    )
  })
})

describe('splitToiletsLocationItems', () => {
  it('splits baby change details out of toilet location bullets', () => {
    expect(
      splitToiletsLocationItems(
        '• On the paid side of the barrier within the stations ticket hall.\n• Separate baby change facilities are also available within the ticket hall on the paid side of the barrier.'
      )
    ).toEqual({
      toiletLocation: '• On the paid side of the barrier within the stations ticket hall.',
      babyChangeLocation:
        '• Separate baby change facilities are also available within the ticket hall on the paid side of the barrier.',
    })
  })

  it('keeps non-baby-change paragraphs on the toilets row', () => {
    expect(
      splitToiletsLocationItems('Accessible toilets are located at station reception near Platform 9.')
    ).toEqual({
      toiletLocation: 'Accessible toilets are located at station reception near Platform 9.',
      babyChangeLocation: null,
    })
  })
})

describe('buildNationalKeyToiletsDisplay', () => {
  it('shows yes with hours when radar key toilets are time-limited (Aberystwyth-style)', () => {
    expect(
      buildNationalKeyToiletsDisplay({
        value: '—',
        notes: ['Available during ticket office opening hours.'],
        location:
          'The National key toilets are located within the Main Station Building; these toilets are operated by a radar key. This is available during ticket office opening hours.',
      })
    ).toEqual({
      value: 'Yes - during ticket office opening hours',
      notes: [],
      location: 'The National key toilets are located within the Main Station Building',
    })
  })

  it('keeps yes without hours when radar key is mentioned but no opening-hours qualifier exists', () => {
    expect(
      buildNationalKeyToiletsDisplay({
        value: 'Yes',
        notes: [],
        location:
          'Accessible toilet is located on the paid side of the barrier in the stations ticket hall. This toilet is operated with a radar key.',
      })
    ).toEqual({
      value: 'Yes',
      notes: [],
      location:
        'Accessible toilet is located on the paid side of the barrier in the stations ticket hall',
    })
  })
})

describe('parseFirstClassLoungeSections', () => {
  it('parses inline label:value lounge notes', () => {
    expect(
      parseFirstClassLoungeSections(
        'Located: the LNER lounge is opposite platform 4.\n\nTickets Accepted in London North Eastern Railway First Class Lounge:\n\n• Fully inter-available First Class Season Ticket\n• Any First Class Anytime ticket\n\nFacilities: Toilets, meeting rooms.\n\nWi-Fi: Yes'
      )
    ).toEqual([
      { label: 'Located', value: 'the LNER lounge is opposite platform 4.' },
      {
        label: 'Tickets Accepted in London North Eastern Railway First Class Lounge',
        value: 'Fully inter-available First Class Season Ticket\n\nAny First Class Anytime ticket',
      },
      { label: 'Facilities', value: 'Toilets, meeting rooms.' },
      { label: 'Wi-Fi', value: 'Yes' },
    ])
    expect(
      hasStructuredFirstClassLoungeSections(
        parseFirstClassLoungeSections(
          'Located: the LNER lounge is opposite platform 4.\n\nFacilities: Toilets, meeting rooms.'
        )
      )
    ).toBe(true)
  })

  it('parses standalone heading paragraphs into labelled sections', () => {
    expect(
      parseFirstClassLoungeSections(
        'Location\n\nAbove the information point on the main concourse\n\nTickets Accepted\n\nAvanti West Coast Anytime tickets.\n\nWi-Fi\n\nWi-Fi is available'
      )
    ).toEqual([
      { label: 'Location', value: 'Above the information point on the main concourse' },
      { label: 'Tickets Accepted', value: 'Avanti West Coast Anytime tickets.' },
      { label: 'Wi-Fi', value: 'Wi-Fi is available' },
    ])
  })
})
