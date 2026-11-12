# Vendor

The temporary verifier tarball was removed. `@adamspitz/verifier` is installed from the sibling checkout `../verifier`.

Docker image builds cannot see that path in the default build context. Compose passes it as the named context `localverifier`, and the Dockerfiles that run root `npm ci` copy it to `/verifier` first (`file:../verifier` from `/app` or `/workspace`).
