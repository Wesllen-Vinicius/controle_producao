declare module '@react-native-community/datetimepicker' {
  import * as React from 'react';
  type Mode = 'date' | 'time' | 'datetime';
  type AndroidDisplay = 'default' | 'spinner' | 'calendar' | 'clock';
  type IOSDisplay = 'default' | 'spinner' | 'compact' | 'inline';

  export interface DateTimePickerEvent { type: string; }
  export interface DateTimePickerProps {
    value: Date;
    mode?: Mode;
    display?: AndroidDisplay | IOSDisplay;
    onChange: (event: DateTimePickerEvent, date?: Date) => void;
    minimumDate?: Date;
    maximumDate?: Date;
    testID?: string;
  }
  const DateTimePicker: React.FC<DateTimePickerProps>;
  export default DateTimePicker;
}
