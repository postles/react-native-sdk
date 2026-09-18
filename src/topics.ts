import type { Topic, TopicChannel } from './models'

export function toTopic(item: any): Topic {
    return {
        subscriptionId: item.subscription_id,
        name: item.name,
        channel: item.channel,
        kind: item.kind ?? 'topic',
        isOptIn: item.is_opt_in ?? false,
        state: item.state,
    }
}

export function toTopicChannel(item: any): TopicChannel {
    const channel: TopicChannel = {
        channel: item.channel,
        label: item.label,
        master: item.master ? toTopic(item.master) : null,
        topics: (item.topics ?? []).map(toTopic),
        paused: item.paused ?? false,
        canResubscribe: item.can_resubscribe ?? true,
    }
    if ('resubscribe_text_number' in item) {
        channel.resubscribeTextNumber = item.resubscribe_text_number
    }
    return channel
}
