import {
  isEmpty, uniqueId, differenceWith,
} from 'lodash';
import parse from './parser.js';
import proxify from './proxy.js';
import fetch from './fetcher.js';
import { mappingLoadingState, mappingFormState } from './mappingStates.js';
import handleError from './cathers.js';

const createFeed = (feedData, url) => {
  const id = uniqueId();
  const { title, description } = feedData;
  return {
    id, title, description, url,
  };
};

const createPosts = (feedData) => feedData.posts.map((post) => {
  const id = uniqueId();
  return { id, ...post };
});

const updatePosts = (state, url) => {
  state.loading.state = mappingLoadingState.processing;

  const proxifiedUrl = proxify(url);
  return fetch(proxifiedUrl)
    .then((data) => {
      const feedData = parse(data);
      const newFeed = createFeed(feedData, url);

      state.data.feeds.unshift(newFeed);

      const newPosts = createPosts(feedData);

      state.data.posts.unshift(...newPosts);
      state.loading.state = mappingLoadingState.done;
    })
    .catch((e) => {
      handleError(e, state);
      state.loading.state = mappingLoadingState.failed;
    })
    .finally(() => {
      state.form.state = mappingFormState.filling;
    });
};

const updatePostsByTimer = (state) => {
  const feedsUrls = state.data.feeds.map((feed) => feed.url);
  const promises = feedsUrls.map((feedUrl) => {
    const proxifiedUrl = proxify(feedUrl);
    return fetch(proxifiedUrl)
      .then((data) => {
        const feedData = parse(data);
        const old = state.data.posts;
        const fresh = feedData.posts;
        const newPostsData = differenceWith(fresh, old, (a, b) => a.link === b.link);
        if (!isEmpty(newPostsData)) {
          feedData.posts = newPostsData;
          const newPosts = createPosts(feedData);

          state.data.posts.unshift(...newPosts);
        }
      })
      .catch((e) => console.error(e));
  });
  Promise.all(promises)
    .finally(() => setTimeout(() => updatePostsByTimer(state), 5000));
};

export { updatePosts, updatePostsByTimer };
