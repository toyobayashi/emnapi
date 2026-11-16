import { constexpr } from './constexpr-runtime';
export function importedCondition() {
    if (constexpr('MEMORY64 == 1')) {
        return 64;
    }
    else {
        return 32;
    }
}
