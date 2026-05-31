import { forwardRef } from 'react';

import { DatePicker as ArkDatePicker, type DatePickerRootProps } from '@ark-ui/react/date-picker';
import { Portal } from '@ark-ui/react/portal';

import './DatePicker.css';

export interface DatePickerProps extends DatePickerRootProps {
  /** Visible, screen-reader-announceable label. Required (WCAG 4.1.2). */
  label: React.ReactNode;
}

export const DatePicker = forwardRef<HTMLDivElement, DatePickerProps>(function DatePicker(
  { label, children, ...rootProps },
  ref,
) {
  return (
    <ArkDatePicker.Root ref={ref} {...rootProps}>
      <ArkDatePicker.Label>{label}</ArkDatePicker.Label>
      <ArkDatePicker.Control>
        <ArkDatePicker.Input />
        <ArkDatePicker.Trigger aria-label="Open calendar">
          {/* calendar icon via CSS content or parent can pass children */}
          &#128197;
        </ArkDatePicker.Trigger>
        <ArkDatePicker.ClearTrigger>Clear</ArkDatePicker.ClearTrigger>
      </ArkDatePicker.Control>
      <Portal>
        <ArkDatePicker.Positioner>
          <ArkDatePicker.Content>
            <ArkDatePicker.View view="day">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl>
                      <ArkDatePicker.PrevTrigger aria-label="Previous month">
                        &#8249;
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger aria-label="Next month">
                        &#8250;
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableHead>
                        <ArkDatePicker.TableRow>
                          {datePicker.weekDays.map((weekDay, id) => (
                            <ArkDatePicker.TableHeader key={id}>
                              {weekDay.short}
                            </ArkDatePicker.TableHeader>
                          ))}
                        </ArkDatePicker.TableRow>
                      </ArkDatePicker.TableHead>
                      <ArkDatePicker.TableBody>
                        {datePicker.weeks.map((week, id) => (
                          <ArkDatePicker.TableRow key={id}>
                            {week.map((day, id) => (
                              <ArkDatePicker.TableCell key={id} value={day}>
                                <ArkDatePicker.TableCellTrigger>
                                  {day.day}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
            <ArkDatePicker.View view="month">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl>
                      <ArkDatePicker.PrevTrigger aria-label="Previous year">
                        &#8249;
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger aria-label="Next year">
                        &#8250;
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableBody>
                        {datePicker
                          .getMonthsGrid({ columns: 4, format: 'short' })
                          .map((months, id) => (
                            <ArkDatePicker.TableRow key={id}>
                              {months.map((month, id) => (
                                <ArkDatePicker.TableCell key={id} value={month.value}>
                                  <ArkDatePicker.TableCellTrigger>
                                    {month.label}
                                  </ArkDatePicker.TableCellTrigger>
                                </ArkDatePicker.TableCell>
                              ))}
                            </ArkDatePicker.TableRow>
                          ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
            <ArkDatePicker.View view="year">
              <ArkDatePicker.Context>
                {(datePicker) => (
                  <>
                    <ArkDatePicker.ViewControl>
                      <ArkDatePicker.PrevTrigger aria-label="Previous decade">
                        &#8249;
                      </ArkDatePicker.PrevTrigger>
                      <ArkDatePicker.ViewTrigger>
                        <ArkDatePicker.RangeText />
                      </ArkDatePicker.ViewTrigger>
                      <ArkDatePicker.NextTrigger aria-label="Next decade">
                        &#8250;
                      </ArkDatePicker.NextTrigger>
                    </ArkDatePicker.ViewControl>
                    <ArkDatePicker.Table>
                      <ArkDatePicker.TableBody>
                        {datePicker.getYearsGrid({ columns: 4 }).map((years, id) => (
                          <ArkDatePicker.TableRow key={id}>
                            {years.map((year, id) => (
                              <ArkDatePicker.TableCell key={id} value={year.value}>
                                <ArkDatePicker.TableCellTrigger>
                                  {year.label}
                                </ArkDatePicker.TableCellTrigger>
                              </ArkDatePicker.TableCell>
                            ))}
                          </ArkDatePicker.TableRow>
                        ))}
                      </ArkDatePicker.TableBody>
                    </ArkDatePicker.Table>
                  </>
                )}
              </ArkDatePicker.Context>
            </ArkDatePicker.View>
            {children}
          </ArkDatePicker.Content>
        </ArkDatePicker.Positioner>
      </Portal>
    </ArkDatePicker.Root>
  );
});
