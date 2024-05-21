/*
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { TestBed } from '@angular/core/testing';
import { of, skip, take } from 'rxjs';
import { AppStore, CONSENT_SHOWN_KEY } from './app.store';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { AppState } from './store/state';
import {
  selectError,
  selectHasConnectionSettings,
  selectHasDevices,
  selectInterfaces,
  selectMenuOpened,
  selectStatus,
} from './store/selectors';
import { TestRunService } from './services/test-run.service';
import SpyObj = jasmine.SpyObj;
import { device } from './mocks/device.mock';
import { fetchSystemStatus, setDevices } from './store/actions';
import { MOCK_PROGRESS_DATA_IN_PROGRESS } from './mocks/progress.mock';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { NotificationService } from './services/notification.service';
import { WINDOW } from './providers/window.provider';
import { Routes } from './model/routes';

const windowMock = {
  location: {
    href: '',
  },
};

const mock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => {
      return store[key] || null;
    },
    setItem: (key: string, value: string) => {
      store[key] = value + '';
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'sessionStorage', {
  value: mock,
  writable: true,
});
describe('AppStore', () => {
  let appStore: AppStore;
  let store: MockStore<AppState>;
  let mockService: SpyObj<TestRunService>;
  let mockNotificationService: SpyObj<NotificationService>;

  beforeEach(() => {
    mockService = jasmine.createSpyObj('mockService', ['fetchDevices']);
    mockNotificationService = jasmine.createSpyObj('mockNotificationService', [
      'notify',
    ]);

    TestBed.configureTestingModule({
      providers: [
        AppStore,
        provideMockStore({
          selectors: [{ selector: selectStatus, value: null }],
        }),
        { provide: TestRunService, useValue: mockService },
        { provide: NotificationService, useValue: mockNotificationService },
        { provide: WINDOW, useValue: windowMock },
      ],
      imports: [BrowserAnimationsModule],
    });

    store = TestBed.inject(MockStore);
    appStore = TestBed.inject(AppStore);

    store.overrideSelector(selectHasDevices, true);
    store.overrideSelector(selectHasConnectionSettings, true);
    store.overrideSelector(selectMenuOpened, true);
    store.overrideSelector(selectInterfaces, {});
    store.overrideSelector(selectError, null);

    spyOn(store, 'dispatch').and.callFake(() => {});
  });

  afterEach(() => {
    mock.clear();
  });

  it('should be created', () => {
    expect(appStore).toBeTruthy();
  });

  describe('updaters', () => {
    it('should update updateConsent', (done: DoneFn) => {
      appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.consentShown).toEqual(true);
        done();
      });

      appStore.updateConsent(true);
    });

    it('should update isStatusLoaded', (done: DoneFn) => {
      appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
        expect(store.isStatusLoaded).toEqual(true);
        done();
      });

      appStore.updateIsStatusLoaded(true);
    });
  });

  describe('selectors', () => {
    it('should select state', done => {
      appStore.viewModel$.pipe(take(1)).subscribe(store => {
        expect(store).toEqual({
          consentShown: false,
          hasDevices: true,
          isStatusLoaded: false,
          systemStatus: null,
          hasConnectionSettings: true,
          isMenuOpen: true,
          interfaces: {},
          settingMissedError: null,
        });
        done();
      });
    });
  });

  describe('effects', () => {
    describe('setContent', () => {
      it('should update store', done => {
        appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.consentShown).toEqual(true);
          done();
        });

        appStore.setContent();
      });

      it('should update store', () => {
        appStore.setContent();

        expect(mock.getItem(CONSENT_SHOWN_KEY)).toBeTruthy();
      });
    });

    describe('fetchDevices', () => {
      const devices = [device];

      beforeEach(() => {
        mockService.fetchDevices.and.returnValue(of(devices));
      });

      it('should dispatch action setDevices', () => {
        appStore.getDevices();

        expect(store.dispatch).toHaveBeenCalledWith(setDevices({ devices }));
      });
    });

    describe('getSystemStatus', () => {
      it('should dispatch fetchSystemStatus', () => {
        appStore.getSystemStatus();

        expect(store.dispatch).toHaveBeenCalledWith(fetchSystemStatus());
      });
    });

    describe('statusLoaded', () => {
      it('should update store', done => {
        appStore.viewModel$.pipe(skip(1), take(1)).subscribe(store => {
          expect(store.isStatusLoaded).toEqual(true);
          done();
        });

        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        store.refreshState();
      });

      it('should notify when url is not "/testing"', () => {
        windowMock.location.href = 'localhost:8080';
        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        store.refreshState();

        expect(mockNotificationService.notify).toHaveBeenCalled();
      });

      it('should not notify when url is "/testing"', () => {
        windowMock.location.href = 'localhost:8080/' + Routes.Testing;
        store.overrideSelector(
          selectStatus,
          MOCK_PROGRESS_DATA_IN_PROGRESS.status
        );
        store.refreshState();

        expect(mockNotificationService.notify).toHaveBeenCalledTimes(0);
      });
    });
  });
});
