import { describe, expect, it } from 'vitest'

import {
  extractKnowledgebaseStationSections,
  formatKnowledgebaseDetailsSourceHint,
  formatKnowledgebaseLastUpdatedLabel,
  formatKnowledgebasePostalAddress,
  formatKnowledgebaseStationAlert,
  humanizeKnowledgebaseKey,
  isKnowledgebaseTabId,
  parseKnowledgebaseTabId,
  readKnowledgebaseNlc,
  toKnowledgebaseTabId,
} from './knowledgebaseStationSections'

describe('knowledgebaseStationSections', () => {
  it('groups scalar identity fields into KB not-used and keeps object sections separate', () => {
    const sections = extractKnowledgebaseStationSections({
      StationV4: {
        CrsCode: 'LDS',
        Name: 'Leeds',
        Latitude: 53.79,
        Longitude: -1.54,
        StationOperator: 'NR',
        Address: {
          PostalAddress: {
            A_5LineAddress: {
              Line: ['Leeds station', 'New Station Street', 'Leeds', 'West Yorkshire'],
              PostCode: 'LS1 4DY',
            },
          },
        },
        AlternativeIdentifiers: { NationalLocationCode: '848700' },
        Accessibility: { InductionLoop: true },
        Staffing: {
          StaffingLevel: 'fullTime',
          ClosedCircuitTelevision: { Available: true },
        },
        StationFacilities: { WiFi: { Available: true } },
        Interchange: { TaxiRank: { Annotation: { Note: 'Taxi' } } },
      },
    })

    expect(sections.map((s) => s.key)).toEqual([
      '__overview__',
      'FacilitiesAndStaffing',
      'Accessibility',
      'Interchange',
    ])
    const facilitiesStaffing = sections.find((s) => s.key === 'FacilitiesAndStaffing')
    expect(facilitiesStaffing?.label).toBe('Facilities & Staffing')
    expect(facilitiesStaffing?.value).toEqual({
      Staffing: { StaffingLevel: 'fullTime' },
      StationFacilities: {
        WiFi: { Available: true },
        ClosedCircuitTelevision: { Available: true },
      },
    })
    expect(sections.some((s) => s.key === 'Staffing' || s.key === 'StationFacilities')).toBe(false)
    expect(sections.some((s) => s.key === 'AlternativeIdentifiers')).toBe(false)
    expect(sections[0]?.label).toBe('KB not-used')
    expect(sections[0]?.value).toMatchObject({
      CrsCode: 'LDS',
      Name: 'Leeds',
    })
    expect(sections[0]?.value).not.toHaveProperty('StationOperator')
    expect(sections.some((s) => s.key === 'Address')).toBe(false)
    expect(toKnowledgebaseTabId('Accessibility')).toBe('kb:Accessibility')
    expect(parseKnowledgebaseTabId('kb:Accessibility')).toBe('Accessibility')
    expect(isKnowledgebaseTabId('kb:Accessibility')).toBe(true)
    expect(isKnowledgebaseTabId('details')).toBe(false)
  })

  it('formats KB postal address as multi-line text with postcode', () => {
    expect(
      formatKnowledgebasePostalAddress({
        StationV4: {
          Address: {
            PostalAddress: {
              A_5LineAddress: {
                Line: ['Leeds station', 'New Station Street', 'Leeds', 'West Yorkshire'],
                PostCode: 'LS1 4DY',
              },
            },
          },
        },
      })
    ).toBe(['Leeds station', 'New Station Street', 'Leeds', 'West Yorkshire', 'LS1 4DY'].join('\n'))
  })

  it('reads NLC from AlternativeIdentifiers', () => {
    expect(
      readKnowledgebaseNlc({
        StationV4: { AlternativeIdentifiers: { NationalLocationCode: '848700' } },
      })
    ).toBe('848700')
  })

  it('moves InformationSystems fields into PassengerServices (Customer Services)', () => {
    const sections = extractKnowledgebaseStationSections({
      StationV4: {
        CrsCode: 'LDS',
        InformationSystems: {
          CIS: {
            DepartureScreens: { Available: true },
            Announcements: { Available: true },
          },
          InformationAvailableFromStaff: {
            Available: true,
            Annotation: { Note: 'Yes - from help point\nYes - from ticket office' },
          },
          CustomerHelpPoints: { Available: true },
          InformationServicesOpen: { Annotation: { Note: 'Desk' } },
        },
        PassengerServices: {
          LeftLuggage: { Available: true },
        },
      },
    })

    const overview = sections.find((s) => s.key === '__overview__')
    expect(overview?.value).toEqual({ CrsCode: 'LDS' })

    const passenger = sections.find((s) => s.key === 'PassengerServices')
    expect(passenger?.value).toEqual({
      LeftLuggage: { Available: true },
      CIS: {
        DepartureScreens: { Available: true },
        Announcements: { Available: true },
      },
      InformationAvailableFromStaff: {
        Available: true,
        Annotation: { Note: 'Yes - from help point\nYes - from ticket office' },
      },
      CustomerHelpPoints: { Available: true },
      InformationServicesOpen: { Annotation: { Note: 'Desk' } },
    })

    expect(sections.some((s) => s.key === 'InformationSystems')).toBe(false)
  })

  it('formats StationAlerts into banner text and omits the sidebar section', () => {
    const data = {
      StationV4: {
        CrsCode: 'KGX',
        StationAlerts: {
          AlertText: '<p>The lifts are out of order between platforms 1-8.</p>',
        },
        Accessibility: { InductionLoop: true },
      },
    }
    const sections = extractKnowledgebaseStationSections(data)
    expect(sections.some((s) => s.key === 'StationAlerts')).toBe(false)
    expect(formatKnowledgebaseStationAlert(data)).toBe(
      'The lifts are out of order between platforms 1-8.'
    )
  })

  it('folds TrainOperatingCompanies into KB not-used', () => {
    const sections = extractKnowledgebaseStationSections({
      StationV4: {
        CrsCode: 'MAN',
        TrainOperatingCompanies: { TocRef: ['AW', 'TP', 'NT'] },
        Accessibility: { InductionLoop: true },
      },
    })
    expect(sections.some((s) => s.key === 'TrainOperatingCompanies')).toBe(false)
    expect(sections.find((s) => s.key === '__overview__')?.value).toMatchObject({
      CrsCode: 'MAN',
      TrainOperatingCompanies: { TocRef: ['AW', 'TP', 'NT'] },
    })
  })

  it('folds ChangeHistory into KB not-used and formats last-updated label', () => {
    const data = {
      StationV4: {
        CrsCode: 'KGX',
        ChangeHistory: {
          ChangedBy: 'NRE CMS Editor',
          LastChangedDate: '2026-07-16T09:46:36.694Z',
        },
        Accessibility: { InductionLoop: true },
      },
    }
    const sections = extractKnowledgebaseStationSections(data)
    expect(sections.some((s) => s.key === 'ChangeHistory')).toBe(false)
    expect(sections.find((s) => s.key === '__overview__')?.value).toMatchObject({
      ChangeHistory: {
        ChangedBy: 'NRE CMS Editor',
        LastChangedDate: '2026-07-16T09:46:36.694Z',
      },
    })
    expect(formatKnowledgebaseLastUpdatedLabel(data)).toBe(
      'The data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46.'
    )
    expect(formatKnowledgebaseDetailsSourceHint(data)).toBe(
      'Some data shown on this page was last updated by National Rail Enquiries on 16th July 2026 at 09:46. With a large majority of data being added by Rail Statistics.'
    )
  })

  it('moves AlwaysShowOysterCardFields and PenaltyFares from Fares to KB not-used for the Admin tab', () => {
    const sections = extractKnowledgebaseStationSections({
      StationV4: {
        CrsCode: 'ABW',
        Fares: {
          UseOystercard: true,
          AlwaysShowOysterCardFields: true,
          PenaltyFares: { Available: true },
          TicketOffice: { Available: true },
        },
        Accessibility: { InductionLoop: true },
      },
    })

    const fares = sections.find((s) => s.key === 'Fares')
    expect(fares?.value).toEqual({
      UseOystercard: true,
      TicketOffice: { Available: true },
    })
    expect(fares?.value).not.toHaveProperty('AlwaysShowOysterCardFields')
    expect(fares?.value).not.toHaveProperty('PenaltyFares')

    const overview = sections.find((s) => s.key === '__overview__')
    expect(overview?.value).toMatchObject({
      CrsCode: 'ABW',
      AlwaysShowOysterCardFields: true,
      PenaltyFares: { Available: true },
    })
  })

  it('humanizes CCTV-related keys as CCTV', () => {
    expect(humanizeKnowledgebaseKey('Cctv')).toBe('CCTV')
    expect(humanizeKnowledgebaseKey('CCTV')).toBe('CCTV')
    expect(humanizeKnowledgebaseKey('ClosedCircuitTelevision')).toBe('CCTV')
  })

  it('humanizes PascalCase CIS values with spaces', () => {
    expect(humanizeKnowledgebaseKey('DepartureScreens')).toBe('Departure Screens')
    expect(humanizeKnowledgebaseKey('ArrivalScreens')).toBe('Arrival Screens')
    expect(humanizeKnowledgebaseKey('Announcements')).toBe('Announcements')
  })
})
