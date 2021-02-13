# Roundtable

> An experimental WebRTC monorepo, namespaced under `@rnd` (for "research'n'development" **but** also an abbreviation of "round" **_and_** also an abbreviation of "random")<br />
> by [Matt Hayes](https://mysterycommand.com)

#### Notes

~~You may need to run `npm install --global node-pre-gyp` (or `npm i -g node-pre-gyp`) before running `npm i` here, the `wrtc` package seems to have an issue with `npm@7` (which this repo uses).~~

```
@see https://github.com/node-webrtc/node-webrtc/issues/658
@see https://github.com/npm/cli/commit/5d9df83958d3d5e6d8acad2ebabfbe5f3fd23c13
```

##### Update

Looks like this isn't necessary under Node v14.15.5 and npm v7.5.4. I've updated the engines field in the root pakage.json to reflect that.
