import { compareVersions, parseAppConfig, updateNotice } from '../../src/core/news/appUpdate';

describe('compareVersions', () => {
  it('compares number by number, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.0')).toBe(1);
    expect(compareVersions('1.1.0', '1.1.0')).toBe(0);
    expect(compareVersions('1.1', '1.1.0')).toBe(0);
    expect(compareVersions('1.0.9', '1.1.0')).toBe(-1);
    expect(compareVersions('2', '1.99.99')).toBe(1);
  });
});

describe('parseAppConfig', () => {
  it('reads versions and an https link', () => {
    expect(parseAppConfig({ latest: '1.2.0', min: '1.1.0', url: 'https://example.com/get' })).toEqual({ latest: '1.2.0', min: '1.1.0', url: 'https://example.com/get' });
  });

  it('ignores what is not a version or a safe link', () => {
    expect(parseAppConfig({ latest: 'soon' })).toBeNull();
    expect(parseAppConfig({ latest: '1.2.0', url: 'javascript:alert(1)' })).toEqual({ latest: '1.2.0', min: undefined, url: undefined });
    expect(parseAppConfig({ latest: '1.2.0', url: 'http://insecure.example.com' })?.url).toBeUndefined();
    expect(parseAppConfig(null)).toBeNull();
    expect(parseAppConfig('x')).toBeNull();
  });
});

describe('updateNotice', () => {
  const config = { latest: '1.3.0', min: '1.2.0', url: 'https://example.com/get' };

  it('says nothing to an up-to-date version or without a configuration', () => {
    expect(updateNotice('1.3.0', config, [])).toEqual({ kind: 'none' });
    expect(updateNotice('1.4.0', config, [])).toEqual({ kind: 'none' });
    expect(updateNotice('1.1.0', null, [])).toEqual({ kind: 'none' });
    expect(updateNotice('garbage', config, [])).toEqual({ kind: 'none' });
  });

  it('offers an update that can be dismissed once per version', () => {
    expect(updateNotice('1.2.5', config, [])).toEqual({ kind: 'available', version: '1.3.0', url: 'https://example.com/get' });
    expect(updateNotice('1.2.5', config, ['1.3.0'])).toEqual({ kind: 'none' });
    expect(updateNotice('1.2.5', { ...config, latest: '1.4.0' }, ['1.3.0']).kind).toBe('available'); // a newer one is offered again
  });

  it('requires the update below the minimum, and a dismissal does not hide it', () => {
    expect(updateNotice('1.1.0', config, ['1.3.0'])).toEqual({ kind: 'required', version: '1.3.0', url: 'https://example.com/get' });
  });
});
