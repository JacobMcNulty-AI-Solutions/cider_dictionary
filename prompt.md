                </Text>
                <View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <Text>
                    5
                    /
                    10
                  </Text>
                </View>
              </View>
              <View>
                <View
                  accessibilityState={
                    {
                      "disabled": false,
                    }
                  }
                  accessible={true}
                >
                  <Text>
                    Save Cider
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
      </View>
    </RCTSafeAreaView>

      206 |       );
      207 |
    > 208 |       const star8 = getAllByTestId('star-8')[0];
          |                     ^
      209 |       fireEvent.press(star8);
      210 |
      211 |       expect(getByText('8/10')).toBeTruthy();

      at Object.getAllByTestId (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:208:21)

  ● QuickEntryScreen Integration Tests › Form Interaction › should update rating when stars are pressed

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Interaction › should handle numeric input for ABV

    Unable to find an element with displayValue: 0

    <RCTSafeAreaView>
      <View>
        <RCTScrollView>
          <View>
            <View>
              <View>
                <Text>
                  Cider Name
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard Crisp Apple"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Brand
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard"
                  value=""
                />
              </View>
              <View>
                <Text>
                  ABV (%)
                </Text>
                <TextInput
                  placeholder="e.g., 5.0"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Overall Rating
                </Text>
                <View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <Text>
                    5
                    /
                    10
                  </Text>
                </View>
              </View>
              <View>
                <View
                  accessibilityState={
                    {
                      "disabled": false,
                    }
                  }
                  accessible={true}
                >
                  <Text>
                    Save Cider
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
      </View>
    </RCTSafeAreaView>

      217 |       );
      218 |
    > 219 |       const abvInput = getAllByDisplayValue('0')[0];
          |                        ^
      220 |       fireEvent.changeText(abvInput, '4.5');
      221 |
      222 |       expect(getAllByDisplayValue('4.5')).toBeTruthy();

      at Object.getAllByDisplayValue (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:219:24)

  ● QuickEntryScreen Integration Tests › Form Interaction › should handle numeric input for ABV

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Interaction › should handle non-numeric ABV input gracefully

    Unable to find an element with displayValue: 0

    <RCTSafeAreaView>
      <View>
        <RCTScrollView>
          <View>
            <View>
              <View>
                <Text>
                  Cider Name
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard Crisp Apple"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Brand
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard"
                  value=""
                />
              </View>
              <View>
                <Text>
                  ABV (%)
                </Text>
                <TextInput
                  placeholder="e.g., 5.0"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Overall Rating
                </Text>
                <View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <Text>
                    5
                    /
                    10
                  </Text>
                </View>
              </View>
              <View>
                <View
                  accessibilityState={
                    {
                      "disabled": false,
                    }
                  }
                  accessible={true}
                >
                  <Text>
                    Save Cider
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
      </View>
    </RCTSafeAreaView>

      228 |       );
      229 |
    > 230 |       const abvInput = getAllByDisplayValue('0')[0];
          |                        ^
      231 |       fireEvent.changeText(abvInput, 'not-a-number');
      232 |
      233 |       // Should default to 0

      at Object.getAllByDisplayValue (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:230:24)

  ● QuickEntryScreen Integration Tests › Form Interaction › should handle non-numeric ABV input gracefully

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should successfully submit valid form data

    Unable to find an element with testID: star-7

    <RCTSafeAreaView>
      <View>
        <RCTScrollView>
          <View>
            <View>
              <View>
                <Text>
                  Cider Name
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard Crisp Apple"
                  value="Test Cider"
                />
              </View>
              <View>
                <Text>
                  Brand
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard"
                  value="Test Brand"
                />
              </View>
              <View>
                <Text>
                  ABV (%)
                </Text>
                <TextInput
                  placeholder="e.g., 5.0"
                  value="5.5"
                />
              </View>
              <View>
                <Text>
                  Overall Rating
                </Text>
                <View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <Text>
                    5
                    /
                    10
                  </Text>
                </View>
              </View>
              <View>
                <View
                  accessibilityState={
                    {
                      "disabled": false,
                    }
                  }
                  accessible={true}
                >
                  <Text>
                    Save Cider
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
      </View>
    </RCTSafeAreaView>

      256 |
      257 |       // Set rating
    > 258 |       const star7 = getAllByTestId('star-7')[0];
          |                     ^
      259 |       fireEvent.press(star7);
      260 |
      261 |       // Submit form

      at Object.getAllByTestId (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:258:21)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should successfully submit valid form data

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should show loading state during submission

    getByTestId is not defined

      295 |
      296 |       // Should show loading spinner
    > 297 |       await waitFor(() => {
          |                    ^
      298 |         expect(getByTestId('activity-indicator')).toBeTruthy();
      299 |       });
      300 |

      at Object.<anonymous> (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:297:20)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should show loading state during submission

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should disable button during loading

    expect(element).toHaveProp("disabled", true) // element.getAttribute(disabled) === true

    Expected the element to have prop:
      disabled=true
    Received:
      null

      324 |
      325 |       // Button should be disabled
    > 326 |       expect(saveButton.parent).toHaveProp('disabled', true);
          |                                 ^
      327 |     });
      328 |
      329 |     it('should reset form after successful submission', async () => {

      at Object.toHaveProp (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:326:33)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should disable button during loading

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should reset form after successful submission

    expect(jest.fn()).toHaveBeenCalled()

    Expected number of calls: >= 1
    Received number of calls:    0

      341 |       fireEvent.press(saveButton);
      342 |
    > 343 |       await waitFor(() => {
          |                    ^
      344 |         expect(mockSqliteService.createCider).toHaveBeenCalled();
      345 |       });
      346 |

      at Object.<anonymous> (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:343:20)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should reset form after successful submission

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should show success alert after submission

    expect(received).toHaveBeenCalledWith(...expected)

    Matcher error: received value must be a mock or spy function

    Received has type:  function
    Received has value: [Function Alert]

      369 |       fireEvent.press(saveButton);
      370 |
    > 371 |       await waitFor(() => {
          |                    ^
      372 |         expect(alertSpy).toHaveBeenCalledWith(
      373 |           'Success!',
      374 |           `${validFormData.name} has been added to your collection.`,

      at Object.<anonymous> (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:371:20)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should show success alert after submission

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Form Submission › should navigate to Collection when View Collection is pressed in alert

    TypeError: alertSpy.mockImplementation is not a function

      386 |
      387 |       // Mock alert to simulate pressing "View Collection" button
    > 388 |       alertSpy.mockImplementation((title, message, buttons) => {
          |                ^
      389 |         if (buttons && buttons.length > 1 && buttons[1].onPress) {
      390 |           buttons[1].onPress();
      391 |         }

      at Object.mockImplementation (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:388:16)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Form Submission › should navigate to Collection when View Collection is pressed in alert

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Error Handling › should show error alert when submission fails

    ReferenceError: validFormData is not defined

      422 |       // Fill form
      423 |       const inputs = getAllByDisplayValue('');
    > 424 |       fireEvent.changeText(inputs[0], validFormData.name);
          |                                       ^
      425 |       fireEvent.changeText(inputs[1], validFormData.brand);
      426 |       fireEvent.changeText(inputs[2], validFormData.abv);
      427 |

      at Object.validFormData (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:424:39)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Error Handling › should show error alert when submission fails

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Error Handling › should handle database initialization failure

    ReferenceError: validFormData is not defined

      448 |       // Fill form
      449 |       const inputs = getAllByDisplayValue('');
    > 450 |       fireEvent.changeText(inputs[0], validFormData.name);
          |                                       ^
      451 |       fireEvent.changeText(inputs[1], validFormData.brand);
      452 |       fireEvent.changeText(inputs[2], validFormData.abv);
      453 |

      at Object.validFormData (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:450:39)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Error Handling › should handle database initialization failure

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Error Handling › should not remain in loading state after error

    ReferenceError: validFormData is not defined

      474 |       // Fill and submit form
      475 |       const inputs = getAllByDisplayValue('');
    > 476 |       fireEvent.changeText(inputs[0], validFormData.name);
          |                                       ^
      477 |       fireEvent.changeText(inputs[1], validFormData.brand);
      478 |       fireEvent.changeText(inputs[2], validFormData.abv);
      479 |

      at Object.validFormData (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:476:39)
      at asyncGeneratorStep (node_modules/@babel/runtime/helpers/asyncToGenerator.js:3:17)
      at _next (node_modules/@babel/runtime/helpers/asyncToGenerator.js:17:9)
      at node_modules/@babel/runtime/helpers/asyncToGenerator.js:22:7
      at Object.<anonymous> (node_modules/@babel/runtime/helpers/asyncToGenerator.js:14:12)

  ● QuickEntryScreen Integration Tests › Error Handling › should not remain in loading state after error

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Keyboard Handling › should have proper keyboard avoiding behavior

    'container' property has been renamed to 'UNSAFE_root'.

    Consider using 'root' property which returns root host element.

      493 |   describe('Keyboard Handling', () => {
      494 |     it('should have proper keyboard avoiding behavior', () => {
    > 495 |       const { container } = render(
          |               ^
      496 |         <QuickEntryScreen {...mockNavigation} />
      497 |       );
      498 |

      at Object.get (node_modules/@testing-library/react-native/src/render.tsx:144:13)
      at Object.container (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:495:15)

  ● QuickEntryScreen Integration Tests › Keyboard Handling › should have proper keyboard avoiding behavior

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Keyboard Handling › should have proper return key types

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Keyboard Handling › should have proper keyboard types

    Unable to find an element with displayValue: 0

    <RCTSafeAreaView>
      <View>
        <RCTScrollView>
          <View>
            <View>
              <View>
                <Text>
                  Cider Name
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard Crisp Apple"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Brand
                  <Text>
                     *
                  </Text>
                </Text>
                <TextInput
                  placeholder="e.g., Angry Orchard"
                  value=""
                />
              </View>
              <View>
                <Text>
                  ABV (%)
                </Text>
                <TextInput
                  placeholder="e.g., 5.0"
                  value=""
                />
              </View>
              <View>
                <Text>
                  Overall Rating
                </Text>
                <View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <View
                    accessible={true}
                  >
                    <Ionicons />
                  </View>
                  <Text>
                    5
                    /
                    10
                  </Text>
                </View>
              </View>
              <View>
                <View
                  accessibilityState={
                    {
                      "disabled": false,
                    }
                  }
                  accessible={true}
                >
                  <Text>
                    Save Cider
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </RCTScrollView>
      </View>
    </RCTSafeAreaView>

      520 |       );
      521 |
    > 522 |       const abvInput = getAllByDisplayValue('0')[0];
          |                        ^
      523 |       expect(abvInput).toHaveProp('keyboardType', 'decimal-pad');
      524 |     });
      525 |   });

      at Object.getAllByDisplayValue (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:522:24)

  ● QuickEntryScreen Integration Tests › Keyboard Handling › should have proper keyboard types

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

  ● QuickEntryScreen Integration Tests › Accessibility › should have proper accessibility labels

    expect(element).toHaveProp("accessible", true) // element.getAttribute(accessible) === true

    Expected the element to have prop:
      accessible=true
    Received:
      null

      532 |
      533 |       const inputs = getAllByDisplayValue('');
    > 534 |       expect(inputs[0]).toHaveProp('accessible', true);
          |                         ^
      535 |       expect(inputs[1]).toHaveProp('accessible', true);
      536 |       expect(inputs[2]).toHaveProp('accessible', true);
      537 |

      at Object.toHaveProp (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:534:25)

  ● QuickEntryScreen Integration Tests › Accessibility › should have proper accessibility labels

    TypeError: alertSpy.mockRestore is not a function

      34 |
      35 |   afterEach(() => {
    > 36 |     alertSpy.mockRestore();
         |              ^
      37 |   });
      38 |
      39 |   describe('Form Rendering', () => {

      at Object.mockRestore (src/screens/QuickEntry/__tests__/QuickEntryScreen.test.tsx:36:14)

Test Suites: 10 failed, 2 passed, 12 total
Tests:       159 failed, 105 passed, 264 total
Snapshots:   0 total
Time:        86.709 s