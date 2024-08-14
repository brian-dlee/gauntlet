import { transform } from "./index"

type SourceDatabaseRecord = {
  id: number;
  location?: {
    id: number,
    name: string;
    hoursOfOperation: string;
  }
}

type TargetViewModel = {
  locationId: number;
  locationName: string;
  locationOpenTime: { hour: number, minute: number };
  locationCloseTime: { hour: number, minute: number };
}

describe('gauntlet', () => {
  test('basic', () => {
    const input: SourceDatabaseRecord = {
      id: 99,
      location: {
        id: 1,
        name: "Best in the West",
        hoursOfOperation: "9:30am - 6:45pm",
      }
    }

    const locationTransformer = transform<SourceDatabaseRecord, TargetViewModel>((input, g) => {
      const { location } = input;

      if (!location) {
        return g.err("There is no location attached to the provided record.")
      }

      const { id: locationId, name: locationName, hoursOfOperation } = location

      const match = /^(\d+)(?::(\d+))?([a|p]m) - (\d+)(?::(\d+))?([a|p]m)/i.exec(hoursOfOperation)
      if (!match) {
        return g.err("The hours of operation are in an invalid format: expected 'H:MMxm - H:MMxm'.")
      }

      let openHour = Number.parseInt(match[1])
      const openMinute = Number.parseInt(match[2] ?? 0)
      const openMeridiem = match[3].toLowerCase()

      if (openMeridiem === 'pm' && openHour !== 12) {
        openHour += 12
      } else if (openMeridiem === 'am' && openHour === 12) {
        openHour = 0
      }

      let closeHour = Number.parseInt(match[4])
      const closeMinute = Number.parseInt(match[5] ?? 0)
      const closeMeridiem = match[6].toLowerCase()

      if (closeMeridiem === 'pm' && closeHour !== 12) {
        closeHour += 12
      } else if (closeMeridiem === 'am' && closeHour === 12) {
        closeHour = 0
      }

      if (openHour * 60 + openMinute > closeHour * 60 + closeMinute) {
        return g.err("The close time must be later than the open time")
      }

      return g.ok({
        locationId,
        locationName,
        locationOpenTime: { hour: openHour, minute: openMinute },
        locationCloseTime: { hour: closeHour, minute: closeMinute }
      })
    })

    const result = locationTransformer(input)

    expect(result.unwrapOrElse(e => expect(e).toBe(undefined))).toEqual({
      locationId: 1,
      locationName: "Best in the West",
      locationOpenTime: { hour: 9, minute: 30 },
      locationCloseTime: { hour: 18, minute: 45 },
    })
  })
})
