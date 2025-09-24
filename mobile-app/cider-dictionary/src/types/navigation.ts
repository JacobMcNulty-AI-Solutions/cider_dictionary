import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootTabParamList {}
  }
}

export type RootTabParamList = {
  Collection: undefined;
  QuickEntry: undefined;
  Analytics: undefined;
  Settings: undefined;
};

export type RootTabScreenProps<Screen extends keyof RootTabParamList> =
  BottomTabScreenProps<RootTabParamList, Screen>;