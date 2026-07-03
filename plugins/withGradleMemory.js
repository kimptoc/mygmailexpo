const { withGradleProperties } = require('@expo/config-plugins');

module.exports = (config) =>
  withGradleProperties(config, (c) => {
    const set = (key, value) => {
      c.modResults = c.modResults.filter(
        (i) => !(i.type === 'property' && i.key === key)
      );
      c.modResults.push({ type: 'property', key, value });
    };
    set('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    set('kotlin.daemon.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m');
    return c;
  });
