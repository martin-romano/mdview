// Live reload: the server pushes a message whenever a file under the root changes.
const events = new EventSource('/__mdview/events');
events.onmessage = () => location.reload();
